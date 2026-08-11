import { Message as WbotMessage, Chat } from "whatsapp-web.js";
import AppError from "../errors/AppError";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";

// Genera todos los IDs serializados posibles para localizar el mensaje.
// WhatsApp usa el formato <fromMe>_<remoteJid>_<id> y el remoteJid puede variar
// (c.us / g.us / s.whatsapp.net / lid) según cómo quedó guardado el contacto.
// Por eso se prueban TODAS las combinaciones: un ID con el remote equivocado
// no se encuentra ni en memoria ni en el IndexedDB.
const buildCandidateIds = (
  ticket: Ticket,
  messageId: string,
  message?: Message | null
): string[] => {
  const rawNumber = ticket.contact.number.replace(/@.+$/, "");

  const remotes = new Set<string>();
  if (ticket.isGroup) {
    remotes.add(`${rawNumber}@g.us`);
  } else {
    remotes.add(`${rawNumber}@c.us`);
    remotes.add(`${rawNumber}@s.whatsapp.net`);
    remotes.add(`${rawNumber}@lid`);
  }
  // Si el número ya venía con dominio (ej. ya guardado como @lid), usarlo también.
  if (ticket.contact.number.includes("@")) {
    remotes.add(ticket.contact.number);
  }

  // Se prueban ambos prefijos: no siempre confiamos en el fromMe de la BD.
  const prefixes = ["true", "false"];

  const candidates: string[] = [];
  // El remote real guardado al crear el mensaje (ej. xxx@lid) es el más
  // confiable: es el JID que WhatsApp usó de verdad, por eso va primero.
  if (message?.remoteJid && message.remoteJid.includes("@")) {
    for (const prefix of prefixes) {
      candidates.push(`${prefix}_${message.remoteJid}_${messageId}`);
    }
  }
  for (const prefix of prefixes) {
    for (const remote of remotes) {
      candidates.push(`${prefix}_${remote}_${messageId}`);
    }
  }
  // El ID crudo no sirve para getMessageById (requiere formato serializado),
  // pero sí para el barrido directo del Store y para matchear en el chat.
  candidates.push(messageId);

  return Array.from(new Set(candidates));
};

export const GetWbotMessage = async (
  ticket: Ticket,
  messageId: string
): Promise<WbotMessage> => {
  const wbot = await GetTicketWbot(ticket);

  if (!ticket.contact.number) {
    console.error("Número del contacto no encontrado en el ticket:", ticket.id);
    throw new AppError("ERR_INVALID_CONTACT_NUMBER", 400);
  }

  const storedMessage = await Message.findByPk(messageId);
  const candidateIds = buildCandidateIds(ticket, messageId, storedMessage);

  // 1) Búsqueda directa con el wrapper de wwebjs. getMessageById usa
  //    Store.Msg.get() y, si no está en memoria, cae a getMessagesById()
  //    (IndexedDB local de la sesión), así que alcanza mensajes viejos
  //    siempre que el ID serializado sea correcto.
  let directLookupFailures = 0;

  for (const serializedId of candidateIds) {
    if (!serializedId.includes("_")) {
      continue; // el ID crudo rompe el formato del wrapper
    }
    try {
      const directMessage = await wbot.getMessageById(serializedId);
      if (directMessage) {
        return directMessage;
      }
    } catch (directError: any) {
      directLookupFailures += 1;
    }
  }

  if (directLookupFailures > 0) {
    console.warn(
      `[GetWbotMessage] getMessageById falló para ${messageId} (${directLookupFailures}/${candidateIds.length} candidatos)`
    );
  }

  // 2) Barrido directo del Store: cubre los casos donde el remote guardado no
  //    coincide con ningún candidato (ej. número sin código de país) pero el
  //    mensaje sí está en la memoria de la sesión. Devuelve el _serialized del
  //    mensaje encontrado; el resto lo hace el wrapper probado (getMessageById).
  try {
    if (!wbot.pupPage) {
      console.warn("[GetWbotMessage] pupPage no disponible, salteando barrido del Store");
    } else {
      const foundSerializedId = await wbot.pupPage.evaluate(
        (cands: string[], targetId: string) => {
          const waw: any = window as any;
          try {
            const Msg =
              (waw.require?.("WAWebCollections")?.Msg) ||
              waw?.Store?.Msg;
            if (!Msg) return null;

            // 2a) get directo por cada candidato.
            for (const c of cands) {
              try {
                const m = Msg.get(c);
                if (m && m.serialize) {
                  const s = m.serialize();
                  if (s && s.id && s.id.id) return s.id["$1"] || s.id._serialized;
                }
              } catch (e) {
                /* probar el siguiente */
              }
            }

            // 2b) barrido de la colección por id.id o sufijo del _serialized.
            try {
              const models = Msg._models || Msg.models || (waw?.Store?.Msg?._models) || (waw?.Store?.Msg?.models) || [];
              for (const m of models) {
                const iid = m?.id?.id || "";
                const sid = m?.id?.["$1"] || m?.id?._serialized || "";
                if (iid === targetId || sid.endsWith(`_${targetId}`)) {
                  if (m.serialize) return sid;
                }
              }
            } catch (e) {
              /* sin coincidencias por barrido */
            }
          } catch (e) {
            /* Store no disponible */
          }
          return null;
        },
        candidateIds,
        messageId
      );

      if (foundSerializedId) {
        const directMessage = await wbot.getMessageById(foundSerializedId);
        if (directMessage) {
          return directMessage;
        }
      }
    }
  } catch (storeError) {
    console.warn("[GetWbotMessage] Barrido directo del Store falló:", storeError);
  }

  // 3) Fallback: buscar en el chat. fetchMessages() de wwebjs pagina hacia
  //    atrás con loadEarlierMsgs() hasta alcanzar el limit, así que un limit
  //    mayor = buscar más profundo (no existe parámetro `before` en esta versión).
  let chatId = storedMessage?.remoteJid || ticket.contact.number;
  if (!chatId.includes("@")) {
    chatId = `${chatId}@${ticket.isGroup ? "g" : "c"}.us`;
  }

  let wbotChat: Chat;
  try {
    wbotChat = await wbot.getChatById(chatId);
  } catch (getChatError: any) {
    console.warn(
      "[GetWbotMessage] getChatById falló, intentando fallback con getChats()"
    );

    const chats = await wbot.getChats();

    wbotChat = chats.find(
      c => c.id._serialized === chatId || c.id.user === ticket.contact.number
    ) as Chat;

    if (!wbotChat) {
      throw new AppError("ERR_CHAT_NOT_FOUND", 400);
    }
  }

  const maxLimit = ticket.isGroup ? 300 : 150;

  try {
    const chatMessages = await wbotChat.fetchMessages({ limit: maxLimit });

    const msgFound = chatMessages.find(
      (msg: WbotMessage) =>
        msg.id.id === messageId ||
        ((msg.id as any)["$1"] && candidateIds.includes((msg.id as any)["$1"])) || candidateIds.includes(msg.id._serialized)
    );

    if (msgFound) {
      return msgFound;
    }
  } catch (fetchError) {
    console.error(
      "[GetWbotMessage] Error al buscar mensajes del chat:",
      fetchError
    );
  }

  throw new AppError("ERR_FETCH_WAPP_MSG", 400);
};

export default GetWbotMessage;
