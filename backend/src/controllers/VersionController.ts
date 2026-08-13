import { Request, Response } from "express";
import * as VersionService from "../services/VersionService/VersionService";
import { logger } from "../utils/logger";

export const getVersion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const versionInfo = await VersionService.getVersionInfo();
    return res.status(200).json(versionInfo);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: "Error al verificar la versión del sistema" });
  }
};
