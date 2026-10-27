import AppError from "../../errors/AppError";
import Client from "../../models/Client";
import ShowClientService from "./ShowClientService";

interface ClientData {
  name?: string;
  isSubscriber?: boolean | string;
  notes?: string | null;
}

interface Request {
  clientData: ClientData;
  id: string | number;
}

const UpdateClientService = async ({
  clientData,
  id
}: Request): Promise<Client> => {
  const client = await ShowClientService(id);
  const { name, isSubscriber, notes } = clientData;

  const updateData: ClientData = {};

  if (name !== undefined) {
    const nombre = String(name).trim();

    if (!nombre) {
      throw new AppError("ERR_CLIENT_NAME_REQUIRED", 400);
    }

    const repetido = await Client.findOne({ where: { name: nombre } });

    if (repetido && repetido.id !== client.id) {
      throw new AppError("ERR_CLIENT_NAME_ALREADY_EXISTS", 409);
    }

    updateData.name = nombre;
  }

  if (isSubscriber !== undefined) {
    updateData.isSubscriber = isSubscriber === true || isSubscriber === "true";
  }

  if (notes !== undefined) {
    updateData.notes = String(notes).trim() || null;
  }

  await client.update(updateData);
  await client.reload();

  return client;
};

export default UpdateClientService;
