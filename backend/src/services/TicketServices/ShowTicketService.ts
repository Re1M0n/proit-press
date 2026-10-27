import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

const ShowTicketService = async (id: string | number): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: [
          "id",
          "name",
          "number",
          "isGroup",
          "address",
          "email",
          "profilePicUrl",
          "messengerId",
          "instagramId",
          "telegramId",
          "webchatId",
          "messageHandling",
          "technicalHardware",
          "technicalOperatingSystem",
          "technicalApplications",
          "contactType"
        ],
        include: [
          "extraInfo",
          "tags",
          {
            model: Client,
            as: "clients",
            attributes: ["id", "name", "isSubscriber"],
            through: { attributes: [] }
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "online"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name", "type", "color"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export default ShowTicketService;
