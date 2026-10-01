import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { isFirebaseConfigured } from "../services/PushNotificationService";
import PushToken from "../models/PushToken";
import User from "../models/User";

export const status = async (req: Request, res: Response): Promise<Response> => {
  const user = await User.findByPk(Number(req.user.id), {
    attributes: ["id", "mobileNotificationsEnabled"]
  });
  if (!user) throw new AppError("ERR_USER_NOT_FOUND", 404);
  return res.json({
    enabled: Boolean(user.mobileNotificationsEnabled),
    configured: isFirebaseConfigured()
  });
};

export const setMode = async (req: Request, res: Response): Promise<Response> => {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    throw new AppError("El campo enabled debe ser booleano", 400);
  }

  const user = await User.findByPk(Number(req.user.id));
  if (!user) throw new AppError("ERR_USER_NOT_FOUND", 404);
  if (enabled && !isFirebaseConfigured()) {
    throw new AppError("Las notificaciones push no están configuradas en el servidor", 503);
  }

  await user.update({ mobileNotificationsEnabled: enabled });
  return res.json({ enabled });
};

export const registerDevice = async (req: Request, res: Response): Promise<Response> => {
  const { token, platform = "android" } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || token.length > 512) {
    throw new AppError("Token de notificaciones inválido", 400);
  }
  if (!/^(android|ios|web)$/.test(platform)) {
    throw new AppError("Plataforma no válida", 400);
  }

  const [device] = await PushToken.findOrCreate({
    where: { token },
    defaults: {
      userId: Number(req.user.id),
      token,
      platform
    }
  });
  if (device.userId !== Number(req.user.id) || device.platform !== platform) {
    await device.update({ userId: Number(req.user.id), platform });
  }
  return res.status(201).json({ registered: true });
};

export const removeDevice = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.body || {};
  if (typeof token !== "string" || token.length > 512) {
    throw new AppError("Token de notificaciones inválido", 400);
  }
  await PushToken.destroy({ where: { token, userId: Number(req.user.id) } });
  return res.status(200).json({ removed: true });
};
