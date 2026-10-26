import { Op } from "sequelize";

import { describirMomento, estaEnHorarioComercial } from "../../helpers/HorarioComercial";
import formatBody from "../../helpers/Mustache";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "./SendWhatsAppMessage";

// Una conversación se considera nueva si no mandamos nada en las últimas 12 h.
// Con eso la bienvenida no se repite en cada mensaje seguido y el aviso fuera
// de horario no se manda dos veces la misma noche.
const VENTANA_CONVERSACION_MS = 12 * 60 * 60 * 1000;

// Último aviso fuera de horario por contacto, en memoria: es una ventana
// temporal, no un dato histórico que valga la pena guardar en la base.
const avisosFueraDeHorario = new Map<string, number>();

/**
 * Antepone el nombre de la conexión como firma ("*MCSI*").
 * Si el texto ya viene firmado, no lo duplica.
 */
const conFirma = (texto: string, nombreConexion: string): string => {
  const firma = `*${nombreConexion}*`;
  const cuerpo = texto.trim();

  if (cuerpo.startsWith(firma)) {
    return cuerpo;
  }

  return `${firma}\n\n${cuerpo}`;
};

const huboMensajeNuestroReciente = async (ticketId: number): Promise<boolean> => {
  const desde = new Date(Date.now() - VENTANA_CONVERSACION_MS);

  const reciente = await Message.findOne({
    where: {
      ticketId,
      fromMe: true,
      createdAt: { [Op.gte]: desde }
    }
  });

  return Boolean(reciente);
};

interface Request {
  ticket: Ticket;
  contact: Contact;
  whatsapp: Whatsapp;
}

/**
 * Envía el mensaje de bienvenida o el de fuera de horario de la conexión,
 * firmado con su nombre.
 *
 * Devuelve `true` si la conexión tiene sus propios mensajes (aunque no se haya
 * enviado nada en este turno) para que quien llama no use el flujo viejo de
 * colas, y `false` cuando la conexión sigue usando el saludo/menú de sectores.
 */
const SendAutoReplyMessage = async ({
  ticket,
  contact,
  whatsapp
}: Request): Promise<boolean> => {
  // Los canales que no son WhatsApp (Telegram) tienen su propio flujo.
  if (whatsapp.type && whatsapp.type !== "wwebjs") {
    return false;
  }

  const bienvenida = (whatsapp.greetingMessage || "").trim();
  const fueraDeHorario = (whatsapp.outOfHoursMessage || "").trim();

  // Sin mensajes propios, o con más de un sector, manda el menú de colas.
  if ((!bienvenida && !fueraDeHorario) || whatsapp.queues?.length !== 1) {
    return false;
  }

  // El sector se asigna igual que antes, para que el ticket no quede huérfano.
  if (!ticket.queue) {
    await UpdateTicketService({
      ticketData: { queueId: whatsapp.queues[0].id },
      ticketId: ticket.id
    });
  }

  const enHorario = estaEnHorarioComercial();
  let texto = "";

  if (enHorario) {
    if (!bienvenida) {
      return true;
    }

    if (await huboMensajeNuestroReciente(ticket.id)) {
      return true;
    }

    texto = bienvenida;
  } else {
    if (!fueraDeHorario) {
      return true;
    }

    const clave = String(contact.id);
    const ultimoAviso = avisosFueraDeHorario.get(clave) || 0;

    if (Date.now() - ultimoAviso < VENTANA_CONVERSACION_MS) {
      logger.info(
        `[AUTO_REPLY] Aviso fuera de horario omitido: ya se envió a ${contact.number} en las últimas 12 h`
      );
      return true;
    }

    texto = fueraDeHorario;
  }

  const body = formatBody(conFirma(texto, whatsapp.name), ticket);

  try {
    await SendWhatsAppMessage({ body, ticket });

    if (!enHorario) {
      avisosFueraDeHorario.set(String(contact.id), Date.now());
    }

    logger.info(
      `[AUTO_REPLY] ${
        enHorario ? "Bienvenida" : "Fuera de horario"
      } enviada a ${contact.number} por ${whatsapp.name} (${describirMomento()})`
    );
  } catch (err: any) {
    logger.error(
      `[AUTO_REPLY] No se pudo enviar a ${contact.number} por ${whatsapp.name}: ${
        err?.message || err
      }`
    );
  }

  return true;
};

export default SendAutoReplyMessage;
