import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { destroyAllWbots } from "./libs/wbot";
import { stopAllTelegramSessions } from "./libs/telegram";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";


const server = app.listen(process.env.PORT, () => {
  logger.info(`Servidor iniciado na porta: ${process.env.PORT}`);
});

initIO(server);
StartAllWhatsAppsSessions();

// Al recibir SIGTERM/SIGINT (p. ej. `pm2 restart`), destruir los clients de
// wwebjs para que sus browsers de Chromium se cierren antes de salir. Si se
// dejan huérfanos, siguen conectados a WhatsApp Web con el mismo LocalAuth y
// la instancia nueva entra en conflicto de sesión: WhatsApp mata ambos.
gracefulShutdown(server, {
  onShutdown: async () => {
    logger.info("Deteniendo sesiones de WhatsApp y Telegram...");
    await destroyAllWbots();
    stopAllTelegramSessions();
  }
});