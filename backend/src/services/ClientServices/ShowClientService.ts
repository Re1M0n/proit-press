import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import Contact from "../../models/Contact";

const ShowClientService = async (id: string | number): Promise<Client> => {
  const client = await Client.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contacts",
        attributes: [
          "id",
          "name",
          "number",
          "profilePicUrl",
          "status",
          "contactType"
        ],
        through: { attributes: [] }
      }
    ]
  });

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  return client;
};

export default ShowClientService;
