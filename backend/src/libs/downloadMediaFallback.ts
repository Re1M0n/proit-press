import { Message as WbotMessage, MessageMedia } from "whatsapp-web.js";

export async function downloadMediaFallback(
  msg: WbotMessage
): Promise<MessageMedia> {
  // Stub: el fallback no está implementado. Se mantiene el throw original,
  // sin logging de debug ni evaluación en la página (ruido en el log de pm2).
  throw new Error("FALLBACK_NOT_IMPLEMENTED");
}
