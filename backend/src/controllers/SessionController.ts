import crypto from "crypto";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import EmailService from "../services/EmailService";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import User from "../models/User";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import AuthUserService from "../services/UserServices/AuthUserService";
import { createActivityLog, ActivityActions, EntityTypes } from "../services/ActivityLogService";
import GetClientIp from "../helpers/GetClientIp";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;
  const clientIp = GetClientIp(req);

  const { token, serializedUser, refreshToken } = await AuthUserService({
    email,
    password
  });

  await createActivityLog({
    userId: serializedUser.id,
    action: ActivityActions.LOGIN,
    description: `Usuario ${serializedUser.name} realizó login en el sistema`,
    entityType: EntityTypes.USER,
    entityId: serializedUser.id,
    ip: clientIp,
    additionalData: { email: serializedUser.email }
  });

  SendRefreshToken(res, refreshToken);

  return res.status(200).json({
    token,
    user: serializedUser
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const token: string = req.cookies.jrt;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  SendRefreshToken(res, refreshToken);

  return res.json({ token: newToken, user });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.user;
  const clientIp = GetClientIp(req);
  
  if (id) {
    const user = await User.findByPk(id);
    if (user) {
      await user.update({ online: false });
      
      // LOG: Logout
      try {
        await createActivityLog({
          userId: user.id,
          action: ActivityActions.LOGOUT,
          description: `Usuario ${user.name} realizó logout del sistema`,
          entityType: EntityTypes.USER,
          entityId: user.id,
          ip: clientIp,
          additionalData: {}
        });
      } catch (error) {
        console.error('Error al crear log de logout:', error);
      }
      
      const io = require("../libs/socket").getIO();
      io.emit("userSessionUpdate", {
        userId: user.id,
        online: false
      });
    }
  }
  
  res.clearCookie("jrt");
  return res.send();
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError("E-mail no encontrado.", 404);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const emailService = EmailService.getInstance();
  
  const sent = await emailService.sendEmail({
    to: email,
    subject: "Restablecimiento de Contraseña",
    text: `Haga clic en el enlace para restablecer su contraseña: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Restablecimiento de Contraseña</h2>
        <p>Hola,</p>
        <p>Usted solicitó el restablecimiento de contraseña de su cuenta.</p>
        <p>Haga clic en el botón de abajo para restablecer su contraseña:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">Restablecer Contraseña</a>
        </p>
        <p>O copie y pegue el siguiente enlace en su navegador:</p>
        <p>${resetUrl}</p>
        <p>Este enlace es válido por 30 minutos.</p>
        <p>Si usted no solicitó el restablecimiento de contraseña, ignore este correo.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">Este es un correo automático, no responda.</p>
      </div>
    `
  });
  
  if (!sent) {
    throw new AppError("Error al enviar correo de restablecimiento de contraseña. Intente de nuevo más tarde.", 500);
  }

  // LOG: Solicitud de restablecimiento de contraseña
  const clientIp = GetClientIp(req);
  try {
    await createActivityLog({
      userId: user.id,
      action: ActivityActions.UPDATE,
      description: `Usuario ${user.name} solicitó restablecimiento de contraseña`,
      entityType: EntityTypes.USER,
      entityId: user.id,
      ip: clientIp,
      additionalData: {
        email: user.email,
        action: 'forgot_password'
      }
    });
  } catch (error) {
    console.error('Error al crear log de solicitud de contraseña:', error);
  }

  return res.status(200).json({ message: "Correo enviado con éxito." });
};

export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Token inválido o expirado.", 400);
  }

  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  // LOG: Senha redefinida
  const clientIp = GetClientIp(req);
  try {
    await createActivityLog({
      userId: user.id,
      action: ActivityActions.UPDATE,
      description: `Usuario ${user.name} restableció la contraseña`,
      entityType: EntityTypes.USER,
      entityId: user.id,
      ip: clientIp,
      additionalData: {
        email: user.email,
        action: 'reset_password'
      }
    });
  } catch (error) {
    console.error('Error al crear log de restablecimiento de contraseña:', error);
  }

  return res.status(200).json({ message: "Contraseña restablecida con éxito." });
};