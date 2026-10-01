import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  // La FK Tickets.whatsappId es ON DELETE SET NULL: sin intervenir, al eliminar
  // el canal TODOS sus tickets quedan sin conexión (huérfanos) y dejan de poder
  // enviar/recibir mensajes. Antes de borrar, los traspasamos a otro canal.
  const linkedTickets = await Ticket.findAll({
    where: { whatsappId: whatsapp.id },
    attributes: ["id"]
  });

  if (linkedTickets.length > 0) {
    // Canal destino: preferimos el predeterminado y, si no lo hay, el más
    // reciente. Nunca el canal que se está eliminando.
    const destination = await Whatsapp.findOne({
      where: { id: { [Op.ne]: whatsapp.id } },
      order: [
        ["isDefault", "DESC"],
        ["updatedAt", "DESC"]
      ]
    });

    // Sin otro canal al que traspasar, bloqueamos el borrado para no dejar
    // tickets huérfanos.
    if (!destination) {
      throw new AppError("ERR_CANT_DELETE_ONLY_WHATSAPP_WITH_TICKETS", 403);
    }

    await Ticket.update(
      { whatsappId: destination.id },
      { where: { whatsappId: whatsapp.id } }
    );

    // Notificamos a las UIs para que refresquen los tickets reasignados.
    // Un fallo al notificar no debe impedir la eliminación.
    try {
      const io = getIO();
      const affectedTickets = await Ticket.findAll({
        where: { id: linkedTickets.map(ticket => ticket.id) },
        include: ["contact", "queue", "whatsapp", "user"]
      });

      affectedTickets.forEach(ticket => {
        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .emit("ticket", {
            action: "update",
            ticket
          });
      });
    } catch (err) {
      console.error(
        `[DELETE_WHATSAPP] No se pudieron notificar los tickets reasignados: ${err?.message}`
      );
    }
  }

  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
