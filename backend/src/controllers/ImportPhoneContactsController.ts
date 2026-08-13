import { Request, Response } from "express";
import ImportContactsService from "../services/WbotServices/ImportContactsService";
import { ActivityActions, EntityTypes } from "../services/ActivityLogService";
import logActivity from "../helpers/logActivity";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const userId:number = parseInt(req.user.id);
  
  await ImportContactsService(userId);

  // LOG: Importar contatos do telefone
  try {
    await logActivity(req, {
      action: ActivityActions.IMPORT,
      description: `Contatos do telefone importados`,
      entityType: EntityTypes.CONTACT,
      entityId: 0,
      additionalData: {
        source: 'phone',
        userId
      }
    });
  } catch (error) {
    console.error('Erro ao criar log de importar contatos:', error);
  }

  return res.status(200).json({ message: "contacts imported" });
};