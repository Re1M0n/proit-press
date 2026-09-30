import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string, includeNativeHeader = false): void => {
  res.cookie("jrt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/auth/refresh_token",
    maxAge: 8 * 60 * 60 * 1000 // 8 horas em milissegundos
  });

  if (includeNativeHeader) {
    res.setHeader("X-Refresh-Token", token);
  }
};
