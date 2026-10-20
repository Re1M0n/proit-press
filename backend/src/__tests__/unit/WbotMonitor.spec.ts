import { EventEmitter } from "events";
import type { Client } from "whatsapp-web.js";
import wbotMonitor from "../../services/WbotServices/wbotMonitor";
import type Whatsapp from "../../models/Whatsapp";

jest.mock("@sentry/node", () => ({ captureException: jest.fn() }));
jest.mock("../../libs/socket", () => ({
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));
jest.mock("../../libs/wbot", () => ({ markSessionNotReady: jest.fn() }));
jest.mock("../../utils/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));
jest.mock("../../services/PushNotificationService", () => ({
  notifyChannelDisconnected: jest.fn().mockResolvedValue(undefined)
}));

describe("wbotMonitor lifecycle callbacks", () => {
  it("informa CONNECTED y agenda una sola reconexión al desconectarse", async () => {
    const wbot = new EventEmitter();
    const whatsapp = {
      id: 45,
      name: "monitor-test",
      update: jest.fn().mockResolvedValue(undefined)
    };
    const scheduleReconnect = jest.fn();
    const markConnected = jest.fn();

    await wbotMonitor(
      wbot as unknown as Client,
      whatsapp as unknown as Whatsapp,
      scheduleReconnect,
      markConnected
    );

    wbot.emit("change_state", "CONNECTED");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(markConnected).toHaveBeenCalledTimes(1);

    wbot.emit("disconnected", "connection lost");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(scheduleReconnect).toHaveBeenCalledTimes(1);
    expect(whatsapp.update).toHaveBeenLastCalledWith({
      status: "OPENING",
      session: "",
      number: ""
    });
  });
});
