jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import remoteJidDoMensagem, {
  sanitizarRemoteJid
} from "../../../helpers/RemoteJidMensagem";

/**
 * Regresión: en la era LID `msg.id.remote` puede ser un objeto (Wid) y no un
 * texto. Guardarlo así hacía fallar la validación de Sequelize
 * ("remoteJid cannot be an array or an object") y el mensaje se perdía entero:
 * no quedaba en el panel.
 */
describe("remoteJidDoMensagem", () => {
  it("devuelve el remote cuando ya es texto", () => {
    expect(
      remoteJidDoMensagem({ id: { remote: "77648764080370@lid" } } as any)
    ).toBe("77648764080370@lid");
  });

  it("normaliza el Wid objeto usando su _serialized", () => {
    expect(
      remoteJidDoMensagem({
        id: {
          remote: { server: "lid", user: "193415279038605", _serialized: "193415279038605@lid" }
        }
      } as any)
    ).toBe("193415279038605@lid");
  });

  it("reconstruye el jid si el Wid no trae _serialized", () => {
    expect(
      remoteJidDoMensagem({
        id: { remote: { server: "c.us", user: "5491162465566" } }
      } as any)
    ).toBe("5491162465566@c.us");
  });

  it("cae al tramo de _serialized cuando el remote es un array", () => {
    expect(
      remoteJidDoMensagem({
        id: { remote: [], _serialized: "false_5491162465566@c.us_3EB0ABCD" }
      } as any)
    ).toBe("5491162465566@c.us");
  });

  it("cae al tramo de _serialized cuando no hay remote útil", () => {
    expect(
      remoteJidDoMensagem({
        id: { _serialized: "true_5491173688074@c.us_3EB0ABCD" }
      } as any)
    ).toBe("5491173688074@c.us");
  });

  it("nunca devuelve un objeto: eso es lo que rompía el guardado", () => {
    const resultado = remoteJidDoMensagem({
      id: { remote: { server: "lid", user: "77648764080370" } }
    } as any);
    expect(typeof resultado).toBe("string");
  });

  it("devuelve null si no hay nada utilizable", () => {
    expect(remoteJidDoMensagem({ id: { remote: {}, _serialized: "" } } as any)).toBeNull();
    expect(remoteJidDoMensagem({ id: {} } as any)).toBeNull();
    expect(remoteJidDoMensagem(null)).toBeNull();
    expect(remoteJidDoMensagem(undefined)).toBeNull();
  });

  it("un mensaje entrante típico (LID) sigue resolviendo igual que antes", () => {
    expect(
      remoteJidDoMensagem({
        id: {
          fromMe: false,
          remote: "77648764080370@lid",
          id: "3EB0ABCD",
          _serialized: "false_77648764080370@lid_3EB0ABCD"
        }
      } as any)
    ).toBe("77648764080370@lid");
  });
});

describe("sanitizarRemoteJid", () => {
  it("acepta texto no vacío", () => {
    expect(sanitizarRemoteJid("5491162465566@c.us")).toBe("5491162465566@c.us");
  });

  it("descarta vacíos, números, arrays y null", () => {
    expect(sanitizarRemoteJid("")).toBeNull();
    expect(sanitizarRemoteJid(42)).toBeNull();
    expect(sanitizarRemoteJid([])).toBeNull();
    expect(sanitizarRemoteJid(null)).toBeNull();
    expect(sanitizarRemoteJid(undefined)).toBeNull();
  });
});
