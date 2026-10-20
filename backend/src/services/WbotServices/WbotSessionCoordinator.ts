export interface WbotSessionCoordinatorHooks<TSession> {
  getReady: (whatsappId: number) => TSession | undefined;
  stopClient: (whatsappId: number) => Promise<void>;
  stopAllClients?: () => Promise<void>;
}

interface SessionOperations<TSession> {
  active?: TSession;
  invalidated?: boolean;
  generation: number;
  start?: Promise<TSession>;
  restart?: Promise<TSession>;
  stop?: Promise<void>;
  reconnectTimer?: NodeJS.Timeout;
  readyWaiters?: Array<{
    resolve: (session: TSession) => void;
    reject: (error: Error) => void;
  }>;
}

export class WbotSessionCoordinator<TSession> {
  private readonly operations = new Map<number, SessionOperations<TSession>>();

  private shuttingDown = false;

  private readonly hooks: WbotSessionCoordinatorHooks<TSession>;

  constructor(hooks: WbotSessionCoordinatorHooks<TSession>) {
    this.hooks = hooks;
  }

  start(
    whatsappId: number,
    create: () => Promise<TSession>
  ): Promise<TSession> {
    if (this.shuttingDown) {
      return Promise.reject(
        new Error("WhatsApp session coordinator is shutting down")
      );
    }

    const operations = this.getOperations(whatsappId);

    if (operations.restart) {
      return operations.restart;
    }

    if (operations.stop) {
      return operations.stop.then(() => this.start(whatsappId, create));
    }

    if (operations.reconnectTimer || operations.invalidated) {
      return this.restart(whatsappId, create);
    }

    if (operations.active !== undefined) {
      return Promise.resolve(operations.active);
    }

    const ready = this.hooks.getReady(whatsappId);
    if (ready !== undefined) {
      operations.active = ready;
      operations.invalidated = false;
      return Promise.resolve(ready);
    }

    return this.startClient(whatsappId, create, operations);
  }

  restart(
    whatsappId: number,
    create: () => Promise<TSession>
  ): Promise<TSession> {
    if (this.shuttingDown) {
      return Promise.reject(
        new Error("WhatsApp session coordinator is shutting down")
      );
    }

    const operations = this.getOperations(whatsappId);

    if (operations.restart) {
      return operations.restart;
    }

    if (operations.stop) {
      return operations.stop.then(() => this.restart(whatsappId, create));
    }

    const generation = operations.generation + 1;
    operations.generation = generation;
    operations.invalidated = true;
    this.cancelReconnect(whatsappId);

    const restart = Promise.resolve().then(async (): Promise<TSession> => {
      await this.hooks.stopClient(whatsappId);
      if (operations.start) {
        await operations.start.catch(() => undefined);
      }

      if (generation !== operations.generation || this.shuttingDown) {
        throw new Error(`Reinicio cancelado para la sesión ${whatsappId}`);
      }

      operations.active = undefined;
      operations.start = undefined;
      return this.startClient(whatsappId, create, operations);
    });

    operations.restart = restart;
    restart.then(
      () => {
        if (operations.restart === restart) {
          operations.restart = undefined;
        }
        this.prune(whatsappId, operations);
      },
      () => {
        if (operations.restart === restart) {
          operations.restart = undefined;
        }
        this.prune(whatsappId, operations);
      }
    );

    return restart;
  }

  waitForReady(whatsappId: number): Promise<TSession> {
    const ready = this.hooks.getReady(whatsappId);
    if (ready !== undefined) {
      return Promise.resolve(ready);
    }
    if (this.shuttingDown) {
      return Promise.reject(
        new Error("WhatsApp session coordinator is shutting down")
      );
    }

    const operations = this.getOperations(whatsappId);
    return new Promise<TSession>((resolve, reject) => {
      if (!operations.readyWaiters) {
        operations.readyWaiters = [];
      }
      operations.readyWaiters.push({ resolve, reject });
    });
  }

  stop(whatsappId: number, beforeStop?: () => Promise<void>): Promise<void> {
    const operations = this.getOperations(whatsappId);

    if (operations.stop) {
      return operations.stop;
    }

    operations.generation += 1;
    operations.invalidated = true;
    this.cancelReconnect(whatsappId);
    WbotSessionCoordinator.rejectReadyWaiters(
      operations,
      new Error(`Sesión WhatsApp ${whatsappId} detenida antes de READY`)
    );

    const stop = Promise.resolve().then(async (): Promise<void> => {
      // Destroy immediately to release initWbot if it is waiting for a QR/READY
      // event. The second call below closes a client that raced with this stop.
      let stopError: unknown;
      try {
        await beforeStop?.();
      } catch (error) {
        stopError = error;
      }
      const restartInFlight = operations.restart;
      const startInFlight = operations.start;
      try {
        await this.hooks.stopClient(whatsappId);
      } catch (error) {
        stopError = stopError || error;
      }
      if (restartInFlight) {
        await restartInFlight.catch(() => undefined);
      }

      if (startInFlight) {
        await startInFlight.catch(() => undefined);
      }

      if (restartInFlight || startInFlight) {
        try {
          await this.hooks.stopClient(whatsappId);
        } catch (error) {
          stopError = stopError || error;
        }
      }
      operations.active = undefined;
      operations.start = undefined;
      operations.restart = undefined;
      operations.invalidated = false;
      if (stopError) {
        throw stopError;
      }
    });

    operations.stop = stop;
    stop.then(
      () => {
        if (operations.stop === stop) {
          operations.stop = undefined;
        }
        this.prune(whatsappId, operations);
      },
      () => {
        if (operations.stop === stop) {
          operations.stop = undefined;
        }
        this.prune(whatsappId, operations);
      }
    );

    return stop;
  }

  scheduleReconnect(
    whatsappId: number,
    reconnect: () => void,
    delayMs = 2000
  ): void {
    const operations = this.getOperations(whatsappId);
    if (this.shuttingDown || operations.stop || operations.restart) {
      return;
    }
    if (operations.reconnectTimer) {
      return;
    }

    operations.invalidated = true;
    const timer = setTimeout(() => {
      if (operations.reconnectTimer !== timer) {
        return;
      }

      operations.reconnectTimer = undefined;
      this.prune(whatsappId, operations);

      try {
        reconnect();
      } catch {
        // El callback de integración registra los fallos asíncronos de inicio.
      }
    }, delayMs);

    operations.reconnectTimer = timer;
  }

  cancelReconnect(whatsappId: number): void {
    const operations = this.operations.get(whatsappId);
    if (!operations?.reconnectTimer) {
      return;
    }

    clearTimeout(operations.reconnectTimer);
    operations.reconnectTimer = undefined;
    this.prune(whatsappId, operations);
  }

  markConnected(_whatsappId: number): void {
    const operations = this.getOperations(_whatsappId);
    if (this.shuttingDown || operations.stop || operations.restart) {
      return;
    }
    if (operations.reconnectTimer) {
      clearTimeout(operations.reconnectTimer);
      operations.reconnectTimer = undefined;
    }

    const ready = this.hooks.getReady(_whatsappId);
    if (ready !== undefined) {
      operations.active = ready;
      operations.readyWaiters?.forEach(waiter => waiter.resolve(ready));
      operations.readyWaiters = undefined;
    }
    operations.invalidated = false;
    this.prune(_whatsappId, operations);
  }

  markDisconnected(whatsappId: number): void {
    const operations = this.getOperations(whatsappId);
    if (!operations.stop && !operations.restart) {
      operations.invalidated = true;
      WbotSessionCoordinator.rejectReadyWaiters(
        operations,
        new Error(`Sesión WhatsApp ${whatsappId} se desconectó antes de READY`)
      );
    }
  }

  cancelAllReconnects(): void {
    this.operations.forEach((operations, whatsappId) => {
      if (operations.reconnectTimer) {
        clearTimeout(operations.reconnectTimer);
        operations.reconnectTimer = undefined;
      }
      this.prune(whatsappId, operations);
    });
  }

  async stopAll(): Promise<void> {
    this.shuttingDown = true;
    this.cancelAllReconnects();
    this.operations.forEach(operations => {
      operations.generation += 1;
      operations.invalidated = true;
      WbotSessionCoordinator.rejectReadyWaiters(
        operations,
        new Error("Backend apagándose antes de READY")
      );
    });

    await this.hooks.stopAllClients?.();

    const pending: Array<Promise<unknown>> = [];
    this.operations.forEach(operations => {
      if (operations.start) pending.push(operations.start);
      if (operations.restart) pending.push(operations.restart);
      if (operations.stop) pending.push(operations.stop);
    });

    await Promise.all(
      pending.map(operation => operation.catch(() => undefined))
    );
    await this.hooks.stopAllClients?.();
    this.operations.clear();
  }

  private startClient(
    whatsappId: number,
    create: () => Promise<TSession>,
    operations: SessionOperations<TSession>
  ): Promise<TSession> {
    if (operations.start) {
      return operations.start;
    }

    const { generation } = operations;
    const start = Promise.resolve()
      .then(create)
      .then(async session => {
        if (generation !== operations.generation || this.shuttingDown) {
          await this.hooks.stopClient(whatsappId);
          throw new Error(`Inicio cancelado para la sesión ${whatsappId}`);
        }
        operations.active = session;
        operations.invalidated = false;
        return session;
      });
    operations.start = start;
    start.then(
      () => {
        if (operations.start === start) {
          operations.start = undefined;
        }
        this.prune(whatsappId, operations);
      },
      () => {
        if (operations.start === start) {
          operations.start = undefined;
        }
        WbotSessionCoordinator.rejectReadyWaiters(
          operations,
          new Error(`Inicio fallido para la sesión ${whatsappId}`)
        );
        this.prune(whatsappId, operations);
      }
    );

    return start;
  }

  private getOperations(whatsappId: number): SessionOperations<TSession> {
    let operations = this.operations.get(whatsappId);
    if (!operations) {
      operations = { generation: 0 };
      this.operations.set(whatsappId, operations);
    }
    return operations;
  }

  private prune(
    whatsappId: number,
    operations: SessionOperations<TSession>
  ): void {
    if (
      !operations.start &&
      !operations.restart &&
      !operations.stop &&
      !operations.reconnectTimer &&
      !operations.readyWaiters?.length &&
      operations.active === undefined &&
      this.operations.get(whatsappId) === operations
    ) {
      this.operations.delete(whatsappId);
    }
  }

  private static rejectReadyWaiters<TWaiterSession>(
    operations: SessionOperations<TWaiterSession>,
    error: Error
  ): void {
    operations.readyWaiters?.forEach(waiter => waiter.reject(error));
    operations.readyWaiters = undefined;
  }
}
