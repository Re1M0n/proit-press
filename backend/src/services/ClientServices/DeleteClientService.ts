import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import ClientContact from "../../models/ClientContact";

const DeleteClientService = async (id: string | number): Promise<void> => {
  const client = await Client.findByPk(id);

  if (!client) {
    throw new AppError("ERR_NO_CLIENT_FOUND", 404);
  }

  // Los enlaces se van con la ficha; los contactos quedan intactos y sin ficha.
  await ClientContact.destroy({ where: { clientId: id } });
  await client.destroy();
};

export default DeleteClientService;
