import { initWbot, listActiveWbotIds, removeWbot } from "../../libs/wbot";
import type Whatsapp from "../../models/Whatsapp";

jest.mock("openai", () => ({
  Configuration: jest.fn(),
  CreateImageRequestSizeEnum: { _1024x1024: "1024x1024" },
  OpenAIApi: jest.fn().mockImplementation(() => ({}))
}));

jest.mock("qrcode-terminal", () => ({
  __esModule: true,
  default: { generate: jest.fn() }
}));

jest.mock("whatsapp-web.js", () => {
  const { EventEmitter } = jest.requireActual(
    "events"
  ) as typeof import("events");
  const MockClient = jest.fn().mockImplementation(() => {
    const client = Object.assign(new EventEmitter(), {
      initialize: jest.fn(() => new Promise<void>(() => undefined)),
      destroy: jest.fn(async () => undefined),
      sendPresenceAvailable: jest.fn()
    });
    return client;
  });

  return { Client: MockClient, LocalAuth: jest.fn() };
});

jest.mock("../../models/Integration", () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue(null) }
}));

jest.mock("../../models/Whatsapp", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));

jest.mock("../../services/WbotServices/SessionEventsService", () => ({
  handleCall: jest.fn(),
  handleMessageReaction: jest.fn(),
  handleVoteUpdate: jest.fn()
}));

jest.mock("../../services/WbotServices/HealthCheckService", () => ({
  initializeHealthTracking: jest.fn(),
  updateLastActivity: jest.fn()
}));

jest.mock("../../services/WbotServices/wbotMessageListener", () => ({
  handleMessage: jest.fn()
}));

jest.mock("../../libs/socket", () => ({
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

jest.mock("../../utils/logger", () => ({
  logger: { level: "info", error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

jest.mock("../../services/PushNotificationService", () => ({
  notifyChannelDisconnected: jest.fn()
}));

interface MockWbotClient {
  emit: (event: string, ...args: unknown[]) => boolean;
  destroy: jest.Mock;
}

const mockClientConstructor = (
  jest.requireMock("whatsapp-web.js") as { Client: jest.Mock }
).Client;

const waitForClient = async (): Promise<MockWbotClient> => {
  const deadline = Date.now() + 2000;
  const wait = async (): Promise<MockWbotClient> => {
    const client = mockClientConstructor.mock.results[0]?.value as
      | MockWbotClient
      | undefined;
    if (client) {
      return client;
    }
    if (Date.now() >= deadline) {
      throw new Error("El cliente simulado no fue creado");
    }
    await new Promise(resolve => setTimeout(resolve, 5));
    return wait();
  };

  return wait();
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("initWbot lifecycle", () => {
  beforeEach(() => {
    mockClientConstructor.mockClear();
  });

  it("resuelve con el cliente al emitir QR, sin esperar READY", async () => {
    const whatsapp = {
      id: 77,
      name: "qr-test",
      retries: 0,
      update: jest.fn().mockResolvedValue(undefined)
    };
    const initialization = initWbot(whatsapp as unknown as Whatsapp);
    const client = await waitForClient();

    client.emit("qr", "test-qr-payload");

    await expect(initialization).resolves.toBe(client);
    expect(whatsapp.update).toHaveBeenCalledWith({
      qrcode: "test-qr-payload",
      status: "qrcode",
      retries: 0,
      type: "wwebjs"
    });

    await removeWbot(whatsapp.id);
  });

  it("stop destruye el cliente pendiente y libera initWbot antes de QR", async () => {
    const whatsapp = {
      id: 78,
      name: "pending-test",
      retries: 0,
      update: jest.fn().mockResolvedValue(undefined)
    };
    const initialization = initWbot(whatsapp as unknown as Whatsapp);
    const client = await waitForClient();

    const stopping = removeWbot(whatsapp.id);

    await expect(initialization).rejects.toThrow("cancelado");
    await expect(stopping).resolves.toBeUndefined();
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it("stop durante la persistencia del QR no deja un cliente huérfano", async () => {
    const qrUpdate = deferred<void>();
    const whatsapp = {
      id: 79,
      name: "qr-race-test",
      retries: 0,
      update: jest.fn(() => qrUpdate.promise)
    };
    const initialization = initWbot(whatsapp as unknown as Whatsapp);
    const client = await waitForClient();

    client.emit("qr", "race-test-qr");
    await Promise.resolve();
    const stopping = removeWbot(whatsapp.id);

    await expect(initialization).rejects.toThrow("cancelado");
    await expect(stopping).resolves.toBeUndefined();
    qrUpdate.resolve(undefined);
    await Promise.resolve();
    await Promise.resolve();

    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(listActiveWbotIds()).not.toContain(whatsapp.id);
  });
});
