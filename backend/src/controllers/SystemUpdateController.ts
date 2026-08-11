import { Request, Response } from "express";
import { 
  checkForUpdates,
  downloadAndInstallUpdate,
  getUpdateStatus,
  listBackups,
  restoreBackup
} from "../services/SystemUpdateService";
import { logger } from "../utils/logger";

export const checkUpdates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const updateInfo = await checkForUpdates();
    return res.status(200).json(updateInfo);
  } catch (err: any) {
    logger.error(`Erro ao verificar atualizações: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

export const installUpdate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const updateInfo = await checkForUpdates();
    
    if (!updateInfo.needsUpdate) {
      return res.status(400).json({ error: "El sistema ya está en la versión más reciente." });
    }
    
    downloadAndInstallUpdate(updateInfo).catch(error => {
      logger.error(`Erro durante o processo de atualização em segundo plano: ${error.message}`);
    });
    
    return res.status(200).json({ 
      success: true, 
      message: "Proceso de actualización completa iniciado con éxito. La actualización incluye backend, frontend y reinicio de los servicios. Seguí el progreso por la ruta /system-update/status." 
    });
  } catch (err: any) {
    logger.error(`Erro ao iniciar atualização: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

export const getStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const status = await getUpdateStatus();
    return res.status(200).json(status);
  } catch (err: any) {
    logger.error(`Erro ao obter status de atualização: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

export const getBackups = async (req: Request, res: Response): Promise<Response> => {
  try {
    const backups = await listBackups();
    return res.status(200).json({ backups });
  } catch (err: any) {
    logger.error(`Erro ao listar backups: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

export const restoreFromBackup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { backupFileName } = req.params;
    
    if (!backupFileName) {
      return res.status(400).json({ error: "Nombre del archivo de backup no proporcionado." });
    }
    
    const result = await restoreBackup(backupFileName);
    return res.status(200).json({ 
      success: result, 
      message: "Proceso de restauración iniciado con éxito." 
    });
  } catch (err: any) {
    logger.error(`Erro ao restaurar backup: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};
