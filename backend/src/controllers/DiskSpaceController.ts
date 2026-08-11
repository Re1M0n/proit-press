import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { getDiskSpaceInfo, getFolderContents } from "../services/DiskSpaceService";

export const getDiskSpace = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const diskSpaceInfo = await getDiskSpaceInfo();
    return res.status(200).json(diskSpaceInfo);
  } catch (error) {
    logger.error(`Erro ao obter informações de espaço em disco: ${error}`);
    return res.status(500).json({ 
      error: "Error al obtener la información de espacio en disco" 
    });
  }
};

export const getFolderContent = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { folderPath } = req.query;
    
    if (!folderPath || typeof folderPath !== 'string') {
      return res.status(400).json({ 
        error: "La ruta de la carpeta es obligatoria" 
      });
    }

    const contents = await getFolderContents(folderPath);
    return res.status(200).json(contents);
  } catch (error) {
    logger.error(`Erro ao obter conteúdo da pasta: ${error}`);
    return res.status(500).json({ 
      error: "Error al obtener el contenido de la carpeta" 
    });
  }
};
