import AppError from "../../errors/AppError";
import Client from "../../models/Client";

interface Request {
  name: string;
  isSubscriber?: boolean | string;
  notes?: string;
}

const CreateClientService = async ({
  name,
  isSubscriber = false,
  notes
}: Request): Promise<Client> => {
  const nombre = String(name || "").trim();

  if (!nombre) {
    throw new AppError("ERR_CLIENT_NAME_REQUIRED", 400);
  }

  const repetido = await Client.findOne({ where: { name: nombre } });

  if (repetido) {
    throw new AppError("ERR_CLIENT_NAME_ALREADY_EXISTS", 409);
  }

  const client = await Client.create({
    name: nombre,
    isSubscriber: isSubscriber === true || isSubscriber === "true",
    notes: notes?.trim() || null
  });

  await client.reload();

  return client;
};

export default CreateClientService;
