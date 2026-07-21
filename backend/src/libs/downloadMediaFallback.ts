import { Message as WbotMessage, MessageMedia } from "whatsapp-web.js";

export async function downloadMediaFallback(
  msg: WbotMessage
): Promise<MessageMedia> {
console.log("[FALLBACK] Entró a downloadMediaFallback");
const debug = await (msg as any).client.pupPage.evaluate(() => {
  const WA = (window as any).require("WAWebCollections");

  const ids: any[] = [];

  WA.Msg.models.slice(-10).forEach((m: any) => {
    ids.push({
      id: m.id,
      serialized: m.id?._serialized,
      type: m.type,
      hasMedia: !!m.mediaData
    });
  });

  return ids;
}, msg.id._serialized);

console.log("[MEDIA FALLBACK DEBUG]");
console.dir(debug, { depth: null });
  throw new Error("FALLBACK_NOT_IMPLEMENTED");
}
