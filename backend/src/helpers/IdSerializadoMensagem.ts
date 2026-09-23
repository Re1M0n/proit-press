import { Message as WbotMessage } from "whatsapp-web.js";

/**
 * Devuelve el id que WhatsApp Web reconoce para citar o editar un mensaje.
 *
 * Por qué existe: en la versión actual de WhatsApp Web (era LID) el id interno
 * `$1` es el válido, mientras que el `_serialized` que arma wwebjs puede venir
 * vacío. Cuando eso pasaba, `quotedMsgSerializedId` quedaba undefined, el envío
 * no incluía `quotedMessageId` y la cita se perdía en silencio: el mensaje salía
 * sin cita y sin ningún error visible (ni en el panel ni en los logs).
 *
 * Es el mismo criterio que ya se usaba a mano para editar mensajes.
 */
const idSerializado = (mensagem?: WbotMessage | null): string | undefined => {
  const id = (mensagem as any)?.id;
  if (!id) {
    return undefined;
  }
  return id["$1"] || id._serialized || undefined;
};

export default idSerializado;
