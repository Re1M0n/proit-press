import { WbotSessionCoordinator } from "../../services/WbotServices/WbotSessionCoordinator";

afterEach(() => {
  jest.useRealTimers();
});

interface TestSession {
  id: number;
}

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("WbotSessionCoordinator", () => {
  it("comparte el inicio concurrente del mismo ID", async () => {
    const ready = new Map<number, TestSession>();
    const creation = deferred<TestSession>();
    const create = jest.fn(() => creation.promise);
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient: async id => {
        ready.delete(id);
      }
    });

    const first = coordinator.start(4, create);
    const second = coordinator.start(4, create);

    await Promise.resolve();
    expect(create).toHaveBeenCalledTimes(1);

    const session = { id: 4 };
    creation.resolve(session);

    await expect(first).resolves.toBe(session);
    await expect(second).resolves.toBe(session);
  });

  it("mantiene la invariante de un cliente con una ráfaga de inicios", async () => {
    const creation = deferred<TestSession>();
    const create = jest.fn(() => creation.promise);
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const starts = Array.from({ length: 50 }, () =>
      coordinator.start(4, create)
    );

    await Promise.resolve();
    expect(create).toHaveBeenCalledTimes(1);

    const session = { id: 4 };
    creation.resolve(session);
    const results = await Promise.all(starts);

    expect(results.every(result => result === session)).toBe(true);
  });

  it("mantiene inicios independientes para IDs distintos", async () => {
    const create = jest.fn(async (id: number) => ({ id }));
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });

    await expect(coordinator.start(4, () => create(4))).resolves.toEqual({
      id: 4
    });
    await expect(coordinator.start(9, () => create(9))).resolves.toEqual({
      id: 9
    });

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("reutiliza la sesión que ya está lista", async () => {
    const session = { id: 4 };
    const create = jest.fn(async () => ({ id: 4 }));
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => (id === 4 ? session : undefined),
      stopClient: async () => undefined
    });

    await expect(coordinator.start(4, create)).resolves.toBe(session);
    expect(create).not.toHaveBeenCalled();
  });

  it("reutiliza una sesión administrada que todavía espera el QR", async () => {
    const create = jest.fn(async () => ({ id: 4 }));
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });

    const first = await coordinator.start(4, create);
    const second = await coordinator.start(4, create);

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("waitForReady se completa cuando la sesión QR pasa a READY", async () => {
    const ready = new Map<number, TestSession>();
    const session = { id: 4 };
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient: async () => undefined
    });

    await coordinator.start(4, async () => session);
    const waiting = coordinator.waitForReady(4);
    ready.set(4, session);
    coordinator.markConnected(4);

    await expect(waiting).resolves.toBe(session);
  });

  it("stop rechaza la espera de READY pendiente", async () => {
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });

    const waiting = coordinator.waitForReady(4);
    await coordinator.stop(4);

    await expect(waiting).rejects.toThrow("detenida antes de READY");
  });

  it("espera el cierre anterior antes de crear el reemplazo", async () => {
    const oldSession = { id: 4 };
    const newSession = { id: 4 };
    const ready = new Map<number, TestSession>([[4, oldSession]]);
    const stop = deferred<void>();
    const stopClient = jest.fn(async () => {
      await stop.promise;
      ready.delete(4);
    });
    const create = jest.fn(async () => {
      const session = newSession;
      ready.set(4, session);
      return session;
    });
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient
    });

    const restart = coordinator.restart(4, create);
    await Promise.resolve();

    expect(stopClient).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();

    stop.resolve(undefined);

    await expect(restart).resolves.toBe(newSession);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("stop interrumpe el inicio pendiente y destruye el cliente parcial", async () => {
    const creation = deferred<TestSession>();
    const ready = new Map<number, TestSession>();
    const stopClient = jest.fn(async (id: number) => {
      creation.resolve({ id });
      ready.delete(id);
    });
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient
    });
    const create = jest.fn(async () => {
      const session = await creation.promise;
      ready.set(4, session);
      return session;
    });

    const start = coordinator.start(4, create);
    await Promise.resolve();
    const stop = coordinator.stop(4);
    await Promise.resolve();

    await expect(stop).resolves.toBeUndefined();
    await expect(start).rejects.toThrow("Inicio cancelado");

    expect(stopClient).toHaveBeenCalled();
    expect(ready.has(4)).toBe(false);
  });

  it("serializa logout antes de destruir y no agenda reconexión durante stop", async () => {
    const order: string[] = [];
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => {
        order.push("destroy");
      }
    });
    const reconnect = jest.fn();

    await coordinator.stop(4, async () => {
      order.push("logout");
      coordinator.scheduleReconnect(4, reconnect, 2000);
    });

    expect(order).toEqual(["logout", "destroy"]);
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("coalesce reinicios simultáneos del mismo ID", async () => {
    const ready = new Map<number, TestSession>([[4, { id: 4 }]]);
    const create = jest.fn(async () => {
      const session = { id: 4 };
      ready.set(4, session);
      return session;
    });
    const stopClient = jest.fn(async (id: number) => {
      ready.delete(id);
    });
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient
    });

    const first = coordinator.restart(4, create);
    const second = coordinator.restart(4, create);

    await expect(first).resolves.toEqual({ id: 4 });
    await expect(second).resolves.toEqual({ id: 4 });
    expect(stopClient).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("coalesce timers de reconexión por ID y permite IDs independientes", () => {
    jest.useFakeTimers();
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const reconnect4 = jest.fn();
    const reconnect9 = jest.fn();

    coordinator.scheduleReconnect(4, reconnect4, 2000);
    coordinator.scheduleReconnect(4, reconnect4, 2000);
    coordinator.scheduleReconnect(9, reconnect9, 2000);
    expect(jest.getTimerCount()).toBe(2);

    jest.advanceTimersByTime(2000);

    expect(reconnect4).toHaveBeenCalledTimes(1);
    expect(reconnect9).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("cancela la reconexión pendiente", () => {
    jest.useFakeTimers();
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const reconnect = jest.fn();

    coordinator.scheduleReconnect(4, reconnect, 2000);
    coordinator.cancelReconnect(4);
    jest.advanceTimersByTime(2000);

    expect(reconnect).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("cancela todos los timers al cerrar el coordinador", () => {
    jest.useFakeTimers();
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const reconnect = jest.fn();

    coordinator.scheduleReconnect(4, reconnect, 2000);
    coordinator.cancelAllReconnects();
    jest.advanceTimersByTime(2000);

    expect(reconnect).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("un start manual durante el timer reemplaza el cliente desconectado", async () => {
    jest.useFakeTimers();
    const oldSession = { id: 4 };
    const newSession = { id: 4 };
    const ready = new Map<number, TestSession>();
    const stopClient = jest.fn(async (id: number) => {
      ready.delete(id);
    });
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: id => ready.get(id),
      stopClient
    });
    const firstCreate = jest.fn(async () => {
      ready.set(4, oldSession);
      return oldSession;
    });
    const secondCreate = jest.fn(async () => {
      ready.set(4, newSession);
      return newSession;
    });

    await coordinator.start(4, firstCreate);
    coordinator.scheduleReconnect(4, jest.fn(), 2000);
    const replacement = await coordinator.start(4, secondCreate);

    expect(replacement).toBe(newSession);
    expect(stopClient).toHaveBeenCalledTimes(1);
    expect(secondCreate).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("markConnected cancela timer y reactiva el cliente administrado", async () => {
    jest.useFakeTimers();
    const session = { id: 4 };
    const create = jest.fn(async () => session);
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const reconnect = jest.fn();

    await coordinator.start(4, create);
    coordinator.scheduleReconnect(4, reconnect, 2000);
    coordinator.markConnected(4);
    jest.advanceTimersByTime(2000);

    await expect(coordinator.start(4, create)).resolves.toBe(session);
    expect(reconnect).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("shutdown cancela timers, destruye clientes y rechaza nuevos inicios", async () => {
    jest.useFakeTimers();
    const stopAllClients = jest.fn(async () => undefined);
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined,
      stopAllClients
    });
    const reconnect = jest.fn();

    await coordinator.start(4, async () => ({ id: 4 }));
    coordinator.scheduleReconnect(9, reconnect, 2000);
    await coordinator.stopAll();
    jest.advanceTimersByTime(2000);

    expect(stopAllClients).toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    await expect(coordinator.start(4, async () => ({ id: 4 }))).rejects.toThrow(
      "shutting down"
    );
  });

  it("limpia el vuelo fallido y permite un nuevo intento", async () => {
    const coordinator = new WbotSessionCoordinator<TestSession>({
      getReady: () => undefined,
      stopClient: async () => undefined
    });
    const failure = new Error("initialize failed");
    const create = jest
      .fn<Promise<TestSession>, []>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ id: 4 });

    await expect(coordinator.start(4, create)).rejects.toBe(failure);
    await expect(coordinator.start(4, create)).resolves.toEqual({ id: 4 });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
