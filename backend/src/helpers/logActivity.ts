import { Request } from "express";
import GetClientIp from "./GetClientIp";
import {
  createActivityLog,
  ActivityActions,
  EntityTypes
} from "../services/ActivityLogService";

interface LogActivityData {
  action: ActivityActions | string;
  description: string;
  entityType?: EntityTypes | string;
  entityId?: number;
  additionalData?: object;
  /** Sobrescribe el userId (p. ej. en login/logout o rutas públicas). */
  userId?: number;
}

/**
 * Registra una entrada de log de actividad a partir de la request,
 * extrayendo el userId del usuario autenticado y la IP del cliente.
 * Si no hay usuario autenticado, se atribuye al sistema (userId 1).
 */
const logActivity = async (req: Request, data: LogActivityData): Promise<void> => {
  const rawUserId = data.userId ?? (req.user?.id ? parseInt(req.user.id, 10) : 1);
  const userId = rawUserId;

  await createActivityLog({
    userId,
    action: data.action,
    description: data.description,
    entityType: data.entityType,
    entityId: data.entityId,
    additionalData: data.additionalData,
    ip: GetClientIp(req)
  });
};

export default logActivity;
