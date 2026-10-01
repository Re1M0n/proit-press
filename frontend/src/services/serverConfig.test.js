import { getBackendConnectionErrorMessage, normalizeBackendUrl } from "./serverConfig";

jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false }
}));

jest.mock("@capacitor/preferences", () => ({
  Preferences: { get: jest.fn(), set: jest.fn() }
}));

describe("normalizeBackendUrl", () => {
  it("assumes HTTPS when a domain is entered without a scheme", () => {
    expect(normalizeBackendUrl("press.example.com")).toBe("https://press.example.com");
  });

  it("assumes HTTPS when an IP and port are entered without a scheme", () => {
    expect(normalizeBackendUrl("192.168.1.10:4000")).toBe("https://192.168.1.10:4000");
  });

  it("preserves an explicitly provided scheme", () => {
    expect(normalizeBackendUrl("http://localhost:4000")).toBe("http://localhost:4000");
  });

  it("rejects unsupported protocols", () => {
    expect(() => normalizeBackendUrl("ftp://press.example.com")).toThrow(/HTTPS/);
  });

  it("rejects URLs containing credentials, query parameters or fragments", () => {
    expect(() => normalizeBackendUrl("https://user:pass@press.example.com")).toThrow(/credenciales/);
    expect(() => normalizeBackendUrl("press.example.com?token=secret")).toThrow(/credenciales/);
    expect(() => normalizeBackendUrl("press.example.com#login")).toThrow(/credenciales/);
  });
});

describe("getBackendConnectionErrorMessage", () => {
  it("explains HTTPS connectivity failures and the explicit HTTP alternative", () => {
    const message = getBackendConnectionErrorMessage(
      { code: "ERR_NETWORK", message: "Network Error" },
      "https://press.example.com"
    );

    expect(message).toContain("Se intentó usar HTTPS");
    expect(message).toContain("http://");
    expect(message).toContain("firewall y CORS");
  });

  it("distinguishes an incorrect backend URL from a network failure", () => {
    expect(getBackendConnectionErrorMessage(
      { response: { status: 404 } },
      "https://press.example.com"
    )).toContain("la dirección del backend");
  });

  it("reports server-side errors by HTTP status", () => {
    expect(getBackendConnectionErrorMessage(
      { response: { status: 503 } },
      "https://press.example.com"
    )).toContain("error interno (HTTP 503)");
  });

  it("reports authentication responses as evidence that the server is reachable", () => {
    expect(getBackendConnectionErrorMessage(
      { response: { status: 401 } },
      "https://press.example.com"
    )).toContain("respondió");
  });
});
