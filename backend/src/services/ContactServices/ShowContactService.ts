import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import Tag from "../../models/Tag";

const ShowContactService = async (id: string | number): Promise<Contact> => {
  const contact = await Contact.findByPk(id, {
    include: [
      "extraInfo",
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"]
      },
      {
        model: Client,
        as: "clients",
        attributes: ["id", "name", "isSubscriber"],
        through: { attributes: [] }
      }
    ]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return contact;
};

export default ShowContactService;
