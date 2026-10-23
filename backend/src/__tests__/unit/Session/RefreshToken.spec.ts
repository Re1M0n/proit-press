import { Request, Response } from "express";
import AppError from "../../../errors/AppError";
import { SendRefreshToken } from "../../../helpers/SendRefreshToken";

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

import AuthUserService from "../../../services/UserServices/AuthUserService";
import { RefreshTokenService } from "../../../services/AuthServices/RefreshTokenService";
import * as SessionController from "../../../controllers/SessionController";

const mockedAuthUserService = AuthUserService as jest.MockedFunction<
  typeof AuthUserService
>;
const mockedRefreshTokenService = RefreshTokenService as jest.MockedFunction<
  typeof RefreshTokenService
>;

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
} = {}): Request => ({ cookies, headers, body } as unknown as Request);

describe("refresh de sesión web por cookie", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("SendRefreshToken guarda el refresh en cookie HttpOnly sin headers", () => {
    const res = buildRes();

    SendRefreshToken(res, "refresh-cookie");

    expect(res.cookie).toHaveBeenCalledWith(
      "jrt",
      "refresh-cookie",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/auth/refresh_token"
      })
    );
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("marca la cookie como Secure en producción", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const res = buildRes();

    try {
      SendRefreshToken(res, "refresh-cookie");
      expect(res.cookie).toHaveBeenCalledWith(
        "jrt",
        "refresh-cookie",
        expect.objectContaining({ secure: true })
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it("renueva la sesión web desde la cookie jrt", async () => {
    const res = buildRes();
    const req = buildReq({ cookies: { jrt: "refresh-original" } });
    mockedRefreshTokenService.mockResolvedValue({
      user: { id: 1 },
      newToken: "access-nuevo",
      refreshToken: "refresh-nuevo"
    } as any);

    await SessionController.update(req, res);

    expect(mockedRefreshTokenService).toHaveBeenCalledWith(res, "refresh-original");
    expect(res.cookie).toHaveBeenCalledWith("jrt", "refresh-nuevo", expect.any(Object));
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ token: "access-nuevo", user: { id: 1 } });
  });

  it("rechaza un refresh sin cookie", async () => {
    const res = buildRes();
    const req = buildReq();

    await expect(SessionController.update(req, res)).rejects.toMatchObject({
      message: "ERR_SESSION_EXPIRED",
      statusCode: 401
    });
    expect(mockedRefreshTokenService).not.toHaveBeenCalled();
  });

  it("el login web devuelve el access token y guarda el refresh en cookie", async () => {
    const res = buildRes();
    const req = buildReq({
      body: { email: "tecnico@test.com", password: "secreta" }
    });
    mockedAuthUserService.mockResolvedValue({
      token: "access",
      serializedUser: { id: 3 },
      refreshToken: "refresh-login"
    } as any);

    await SessionController.store(req, res);

    expect(res.cookie).toHaveBeenCalledWith("jrt", "refresh-login", expect.any(Object));
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: "access", user: { id: 3 } });
  });

  it("propaga ERR_USER_INACTIVE al refrescar", async () => {
    const res = buildRes();
    const req = buildReq({ cookies: { jrt: "refresh-cookie" } });
    mockedRefreshTokenService.mockRejectedValue(
      new AppError("ERR_USER_INACTIVE", 401)
    );

    await expect(SessionController.update(req, res)).rejects.toMatchObject({
      message: "ERR_USER_INACTIVE"
    });
  });
});
