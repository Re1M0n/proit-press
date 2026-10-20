import { initWbot, isSessionReady, getWbot, removeWbot } from "../../libs/wbot";
import { getIO } from "../../libs/socket";
import { wbotMessageListener } from "../../services/WbotServices/wbotMessageListener";
import wbotMonitor from "../../services/WbotServices/wbotMonitor";
import GroupEventsService from "../../services/WbotServices/GroupEventsService";
import Whatsapp from "../../models/Whatsapp";
import { StartWhatsAppSession } from "../../services/WbotServices/StartWhatsAppSession";

jest.mock("../../libs/wbot", () => ({
  initWbot: jest.fn(),
  isSessionReady: jest.fn(() => false),
  getWbot: jest.fn(),
  removeWbot: jest.fn().mockResolvedValue(undefined),
  destroyAllWbots: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../libs/telegram", () => ({
  startTelegramSession: jest.fn()
}));

jest.mock("../../libs/socket", () => ({
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

jest.mock("../../services/WbotServices/wbotMessageListener", () => ({
  wbotMessageListener: jest.fn()
}));

jest.mock("../../services/WbotServices/wbotMonitor", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../services/WbotServices/GroupEventsService", () => ({
  __esModule: true,
  default: { setupGroupListeners: jest.fn() }
}));

jest.mock("../../models/Whatsapp", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));

jest.mock("../../utils/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

interface TestWbot {
  id: number;
  on: jest.Mock;
  once: jest.Mock;
}

describe("StartWhatsAppSession", () => {
  it("registra listeners y crea un solo cliente ante inicios concurrentes", async () => {
    const whatsappId = 4301;
    const wbot: TestWbot = {
      id: whatsappId,
      on: jest.fn(),
      once: jest.fn()
    };
    const whatsapp = {
      id: whatsappId,
      name: "primary",
      type: "wwebjs",
      update: jest.fn().mockResolvedValue(undefined)
    } as unknown as Whatsapp;

    (initWbot as jest.Mock).mockResolvedValue(wbot);
    (isSessionReady as jest.Mock).mockReturnValue(false);
    (getWbot as jest.Mock).mockReturnValue(wbot);

    await Promise.all([
      StartWhatsAppSession(whatsapp),
      StartWhatsAppSession(whatsapp)
    ]);

    expect(initWbot).toHaveBeenCalledTimes(1);
    expect(removeWbot).toHaveBeenCalledTimes(1);
    expect(wbotMessageListener).toHaveBeenCalledTimes(1);
    expect(wbotMonitor).toHaveBeenCalledTimes(1);
    expect(GroupEventsService.setupGroupListeners).toHaveBeenCalledTimes(1);
    expect(getIO).toHaveBeenCalledTimes(1);
    expect(whatsapp.update).toHaveBeenCalledTimes(1);
  });
});
