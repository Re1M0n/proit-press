import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import {
  MessageHandlingMode,
  MESSAGE_HANDLING_MODES
} from "../../helpers/MessageHandling";

interface Request {
  contactId: string | number;
  messageHandling?: string | null;
}

/**
 * Cambia sólo el manejo de mensajes del contacto (normal / silent / ignore).
 *
 * Existe como endpoint propio para que el panel pueda ofrecerlo desde el chat
 * sin mandar el contacto entero: `PUT /contacts/:id` valida el número contra
 * WhatsApp y toca todos los campos, lo que es demasiado para un toggle.
 *
 * A diferencia del helper de normalización (que ante un valor raro cae en
 * "normal" para no silenciar a nadie por accidente), acá un valor inválido se
 * rechaza: si el panel manda algo que no entiende, es mejor un error visible
 * que cambiar en silencio el comportamiento de un contacto.
 */
const UpdateContactMessageHandlingService = async ({
  contactId,
  messageHandling
}: Request): Promise<Contact> => {
  const solicitado = String(messageHandling ?? "").trim().toLowerCase();

  if (!(MESSAGE_HANDLING_MODES as string[]).includes(solicitado)) {
    throw new AppError("ERR_INVALID_MESSAGE_HANDLING", 400);
  }

  const contact = await Contact.findByPk(contactId);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  await contact.update({ messageHandling: solicitado as MessageHandlingMode });

  return contact;
};

export default UpdateContactMessageHandlingService;
