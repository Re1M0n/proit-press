import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ClientStatus from "../../models/ClientStatus";
import ShowService from "./ShowService";

interface ClientStatusData {
  id?: number;
  name?: string;
  color?: string;
}

interface Request {
  clientStatusData: ClientStatusData;
  id: string | number;
}

const UpdateService = async ({
  clientStatusData,
  id
}: Request): Promise<ClientStatus> => {
  try {
    const clientStatus = await ShowService(id);
    const { name, color } = clientStatusData;
    
    if (name) {
      const schema = Yup.object().shape({
        name: Yup.string().min(3, "El nombre del status debe tener al menos 3 caracteres")
      });

      try {
        await schema.validate({ name });
      } catch (err: any) {
        throw new AppError(err.message, 400);
      }
    }

    const updateData: ClientStatusData = {};
    
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    await clientStatus.update(updateData);

    await clientStatus.reload();
    
    return clientStatus;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    console.error("Error al actualizar status:", error);
    throw new AppError("Error al actualizar status. Verifique los datos e intente nuevamente.", 500);
  }
};

export default UpdateService;
