import { Op, WhereOptions } from "sequelize";
import Contact from "../../models/Contact";
import Reminder from "../../models/Reminder";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

interface Request {
  from: Date;
  to: Date;
}

const ListRemindersService = async ({
  from,
  to
}: Request): Promise<Reminder[]> => {
  const where: WhereOptions = {
    dueAt: {
      [Op.gte]: from,
      [Op.lte]: to
    }
  };

  return Reminder.findAll({
    attributes: [
      "id",
      "userId",
      "title",
      "notes",
      "dueAt",
      "status",
      "recurrence",
      "ticketId",
      "contactId",
      "notifiedAt",
      "createdAt",
      "updatedAt"
    ],
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id"],
        include: [{ model: Contact, as: "contact", attributes: ["id", "name"] }]
      },
      { model: Contact, as: "contact", attributes: ["id", "name"] }
    ],
    order: [["dueAt", "ASC"], ["id", "ASC"]]
  });
};

export default ListRemindersService;
