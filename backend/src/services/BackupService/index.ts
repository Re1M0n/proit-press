import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const DB_CONFIG = require("../../config/database");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface BackupInfo {
  filename: string;
  path: string;
  size: string;
  date: string;
  timestamp: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

export const listBackups = async (): Promise<BackupInfo[]> => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return [];
    }
    
    const files = fs.readdirSync(BACKUP_DIR).filter(file => 
      file.endsWith('.sql') || file.endsWith('.sql.gz')
    );
    
    const backups = files.map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        path: filePath,
        size: formatBytes(stats.size),
        date: format(stats.mtime, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: pt }),
        timestamp: stats.mtime.getTime()
      };
    });
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error: any) {
    logger.error(`Error al listar backups: ${error.message}`);
    throw new Error(`No fue posible listar los backups: ${error.message}`);
  }
};

export const createBackup = async (customName?: string): Promise<BackupInfo> => {
  try {
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const filename = customName 
      ? `${customName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.sql.gz` 
      : `backup_${timestamp}.sql.gz`;
    
    const filePath = path.join(BACKUP_DIR, filename);
    
    const command = `mysqldump --host=${DB_CONFIG.host} --port=${DB_CONFIG.port} --user=${DB_CONFIG.username} --password=${DB_CONFIG.password} ${DB_CONFIG.database} | gzip > ${filePath}`;
    
    logger.info(`Iniciando backup de la base de datos para ${filePath}`);
    await execAsync(command);
    
    if (!fs.existsSync(filePath)) {
      throw new Error("Backup falló: archivo no fue creado");
    }
    
    const stats = fs.statSync(filePath);
    
    logger.info(`Backup concluido con éxito: ${filePath} (${formatBytes(stats.size)})`);
    
    return {
      filename,
      path: filePath,
      size: formatBytes(stats.size),
      date: format(stats.mtime, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: pt }),
      timestamp: stats.mtime.getTime()
    };
  } catch (error: any) {
    logger.error(`Error al crear backup: ${error.message}`);
    throw new Error(`No fue posible crear el backup: ${error.message}`);
  }
};

export const restoreBackup = async (filename: string): Promise<{ success: boolean; message: string }> => {
  try {
    const filePath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo de backup no encontrado: ${filename}`);
    }
    
    logger.info(`Iniciando restauración del backup: ${filePath}`);
    
    let command;
    if (filename.endsWith('.sql.gz')) {
      command = `gunzip < ${filePath} | mysql --host=${DB_CONFIG.host} --port=${DB_CONFIG.port} --user=${DB_CONFIG.username} --password=${DB_CONFIG.password} ${DB_CONFIG.database}`;
    } else {
      command = `mysql --host=${DB_CONFIG.host} --port=${DB_CONFIG.port} --user=${DB_CONFIG.username} --password=${DB_CONFIG.password} ${DB_CONFIG.database} < ${filePath}`;
    }
    
    await execAsync(command);
    
    logger.info(`Restauración del backup concluida con éxito: ${filePath}`);
    
    return {
      success: true,
      message: `Backup restaurado con éxito: ${filename}`
    };
  } catch (error: any) {
    logger.error(`Error al restaurar backup: ${error.message}`);
    throw new Error(`No fue posible restaurar el backup: ${error.message}`);
  }
};

export const uploadBackup = async (file: Express.Multer.File): Promise<BackupInfo> => {
  try {
    if (!file.originalname.endsWith('.sql') && !file.originalname.endsWith('.sql.gz')) {
      throw new Error('Formato de archivo inválido. Solo archivos .sql o .sql.gz son aceptados.');
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = `importado_${timestamp}_${sanitizedName}`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, file.buffer);
    
    const stats = fs.statSync(filePath);
    
    logger.info(`Backup importado con éxito: ${filePath} (${formatBytes(stats.size)})`);
    
    return {
      filename,
      path: filePath,
      size: formatBytes(stats.size),
      date: format(stats.mtime, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: pt }),
      timestamp: stats.mtime.getTime()
    };
  } catch (error: any) {
    logger.error(`Error al importar backup: ${error.message}`);
    throw new Error(`No fue posible importar el backup: ${error.message}`);
  }
};

export const deleteBackup = async (filename: string): Promise<{ success: boolean; message: string }> => {
  try {
    const filePath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo de backup não encontrado: ${filename}`);
    }
    
    fs.unlinkSync(filePath);
    
    logger.info(`Backup excluido con éxito: ${filePath}`);
    
    return {
      success: true,
      message: `Backup excluido con éxito: ${filename}`
    };
  } catch (error: any) {
    logger.error(`Error al excluir backup: ${error.message}`);
    throw new Error(`No fue posible excluir el backup: ${error.message}`);
  }
};
