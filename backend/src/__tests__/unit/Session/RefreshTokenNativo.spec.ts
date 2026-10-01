import { Request, Response } from "express";

import AppError from "../../../errors/AppError";
import { SendRefreshToken } from "../../../helpers/SendRefreshToken";

// El refresh token de la app Android (WebView de Capacitor) no puede depender
// de cookies: el WebView es cross-site con el backend, así que la cookie jrt no
// viaja. Por eso el servidor devuelve el token en el header X-Refresh-Token
// cuando el request trae X-Client-App: proit-press-android, y lo lee de ese
// header en /auth/refresh_token. Estos tests fijan ese contrato (header vs
// cookie) para que no se rompa en silencio: si el header desaparece, la app
// queda con la sesión vencida sin que la web lo note.
jest.mock("../../../services/UserServices/AuthUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../../services/AuthServices/RefreshTokenService", () => ({
  RefreshTokenService: jest.fn()
}));
jest.mock("../../../helpers/logActivity", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../../services/ActivityLogService", () => ({
  ActivityActions: { LOGIN: "LOGIN" },
  EntityTypes: { USER: "USER" }
}));
jest.mock("../../../services/EmailService", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() }
}));
jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));
jest.mock("../../../models/UserSession", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), update: jest.fn() }
}));

import AuthUserService from "../../../services/UserServices/AuthUserService";
import { RefreshTokenService } from "../../../services/AuthServices/RefreshTokenService";
import * as SessionController from "../../../controllers/SessionController";

const mockedAuthUserService = AuthUserService as jest.MockedFunction<
  typeof AuthUserService
>;
const mockedRefreshTokenService = RefreshTokenService as jest.MockedFunction<
  typeof RefreshTokenService
>;

// Identificador que manda la app Android en cada request (ver services/api.js).
const APP_HEADER = "proit-press-android";

type MockRes = Response & {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
  setHeader: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

const buildRes = (): MockRes => {
  const res: any = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res as MockRes;
};

const buildReq = ({
  cookies = {},
  headers = {},
  body = {}
}: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
} = {}): Request =>
  ({ cookies, headers, body } as unknown as Request);

describe("refresh token nativo (header vs cookie)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("SendRefreshToken", () => {
    it("en la web guarda el refresh en una cookie httpOnly y no expone el header", () => {
      const res = buildRes();

      SendRefreshToken(res, "token-refresh");

      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        "jrt",
        "token-refresh",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          path: "/auth/refresh_token"
        })
      );
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it("en la app Android expone además X-Refresh-Token (sin dejar de guardar la cookie)", () => {
      const res = buildRes();

      SendRefreshToken(res, "token-refresh", true);

      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Refresh-Token",
        "token-refresh"
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "jrt",
        "token-refresh",
        expect.any(Object)
      );
    });

    it("marca la cookie como Secure en producción", () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const res = buildRes();

      try {
        SendRefreshToken(res, "token-refresh");

        expect(res.cookie).toHaveBeenCalledWith(
          "jrt",
          "token-refresh",
          expect.objectContaining({ secure: true })
        );
      } finally {
        process.env.NODE_ENV = original;
      }
    });
  });

  describe("SessionController.update (refresh)", () => {
    it("en la web toma el token de la cookie jrt y no expone header", async () => {
      const res = buildRes();
      const req = buildReq({ cookies: { jrt: "refresh-web" } });
      mockedRefreshTokenService.mockResolvedValue({
        user: { id: 1 },
        newToken: "access-nuevo",
        refreshToken: "refresh-nuevo"
      } as any);

      await SessionController.update(req, res);

      expect(mockedRefreshTokenService).toHaveBeenCalledWith(res, "refresh-web");
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        token: "access-nuevo",
        user: { id: 1 }
      });
    });

    it("en la app Android toma el token del header X-Refresh-Token y lo rota en la respuesta", async () => {
      const res = buildRes();
      const req = buildReq({
        headers: {
          "x-refresh-token": "refresh-nativo",
          "x-client-app": APP_HEADER
        }
      });
      mockedRefreshTokenService.mockResolvedValue({
        user: { id: 2 },
        newToken: "access-2",
        refreshToken: "refresh-2"
      } as any);

      await SessionController.update(req, res);

      expect(mockedRefreshTokenService).toHaveBeenCalledWith(
        res,
        "refresh-nativo"
      );
      expect(res.setHeader).toHaveBeenCalledWith("X-Refresh-Token", "refresh-2");
    });

    it("si vienen cookie y header, la cookie jrt tiene prioridad", async () => {
      const res = buildRes();
      const req = buildReq({
        cookies: { jrt: "refresh-cookie" },
        headers: { "x-refresh-token": "refresh-header" }
      });
      mockedRefreshTokenService.mockResolvedValue({
        user: {},
        newToken: "t",
        refreshToken: "r"
      } as any);

      await SessionController.update(req, res);

      expect(mockedRefreshTokenService).toHaveBeenCalledWith(
        res,
        "refresh-cookie"
      );
    });

    it("sin cookie ni header falla con ERR_SESSION_EXPIRED y no llama al servicio", async () => {
      const res = buildRes();
      const req = buildReq();

      await expect(SessionController.update(req, res)).rejects.toMatchObject({
        message: "ERR_SESSION_EXPIRED",
        statusCode: 401
      });
      expect(mockedRefreshTokenService).not.toHaveBeenCalled();
    });

    it("propaga ERR_USER_INACTIVE sin convertirlo en sesión expirada", async () => {
      const res = buildRes();
      const req = buildReq({
        headers: {
          "x-refresh-token": "refresh-nativo",
          "x-client-app": APP_HEADER
        }
      });
      mockedRefreshTokenService.mockRejectedValue(
        new AppError("ERR_USER_INACTIVE", 401)
      );

      await expect(SessionController.update(req, res)).rejects.toMatchObject({
        message: "ERR_USER_INACTIVE"
      });
    });
  });

  describe("SessionController.store (login)", () => {
    it("devuelve X-Refresh-Token cuando el login viene de la app Android", async () => {
      const res = buildRes();
      const req = buildReq({
        body: { email: "tecnico@test.com", password: "secreta" },
        headers: { "x-client-app": APP_HEADER }
      });
      mockedAuthUserService.mockResolvedValue({
        token: "access",
        serializedUser: { id: 3 },
        refreshToken: "refresh-login"
      } as any);

      await SessionController.store(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Refresh-Token",
        "refresh-login"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: "access",
        user: { id: 3 }
      });
    });

    it("en la web no expone el header, sólo deja la cookie jrt", async () => {
      const res = buildRes();
      const req = buildReq({
        body: { email: "tecnico@test.com", password: "secreta" }
      });
      mockedAuthUserService.mockResolvedValue({
        token: "access",
        serializedUser: { id: 4 },
        refreshToken: "refresh-login"
      } as any);

      await SessionController.store(req, res);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        "jrt",
        "refresh-login",
        expect.any(Object)
      );
    });
  });
});
