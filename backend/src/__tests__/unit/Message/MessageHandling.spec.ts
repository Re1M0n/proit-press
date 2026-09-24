import {
  contatoIgnoraMensagens,
  contatoSilenciado,
  MESSAGE_HANDLING_MODES,
  noLeidasDoContato,
  normalizarMessageHandling
} from "../../../helpers/MessageHandling";

/**
 * Regresión: la guarda global `CheckMsgIsGroup` era todo-o-nada y no cubría los
 * casos reales (canales @newsletter que llegan como chat 1:1, números de
 * promociones, contactos que no deben generar ticket). El criterio ahora vive
 * por contacto y este archivo fija su comportamiento.
 *
 * El error más caro posible acá es silenciar por accidente a un contacto
 * válido, así que lo desconocido siempre cae en "normal".
 */
describe("normalizarMessageHandling", () => {
  it("acepta los tres modos válidos", () => {
    expect(normalizarMessageHandling("normal")).toBe("normal");
    expect(normalizarMessageHandling("silent")).toBe("silent");
    expect(normalizarMessageHandling("ignore")).toBe("ignore");
  });

  it("tolera mayúsculas y espacios", () => {
    expect(normalizarMessageHandling("  IGNORE ")).toBe("ignore");
    expect(normalizarMessageHandling("Silent")).toBe("silent");
  });

  it("cae en normal con valores desconocidos o vacíos", () => {
    expect(normalizarMessageHandling("banido")).toBe("normal");
    expect(normalizarMessageHandling("")).toBe("normal");
    expect(normalizarMessageHandling(null)).toBe("normal");
    expect(normalizarMessageHandling(undefined)).toBe("normal");
    expect(normalizarMessageHandling(123 as any)).toBe("normal");
  });

  it("expone exactamente los modos soportados", () => {
    expect(MESSAGE_HANDLING_MODES).toEqual(["normal", "silent", "ignore"]);
  });
});

describe("contatoIgnoraMensagens", () => {
  it("es true solo con ignore", () => {
    expect(contatoIgnoraMensagens({ messageHandling: "ignore" })).toBe(true);
    expect(contatoIgnoraMensagens({ messageHandling: "silent" })).toBe(false);
    expect(contatoIgnoraMensagens({ messageHandling: "normal" })).toBe(false);
  });

  it("nunca ignora un contacto sin configuración (o null)", () => {
    expect(contatoIgnoraMensagens({})).toBe(false);
    expect(contatoIgnoraMensagens(null)).toBe(false);
    expect(contatoIgnoraMensagens(undefined)).toBe(false);
  });
});

describe("contatoSilenciado", () => {
  it("es true solo con silent", () => {
    expect(contatoSilenciado({ messageHandling: "silent" })).toBe(true);
    expect(contatoSilenciado({ messageHandling: "ignore" })).toBe(false);
    expect(contatoSilenciado({ messageHandling: "normal" })).toBe(false);
  });

  it("un contacto sin configuración no queda silenciado", () => {
    expect(contatoSilenciado({})).toBe(false);
    expect(contatoSilenciado(null)).toBe(false);
  });
});

describe("noLeidasDoContato", () => {
  it("un contacto normal acumula las no leídas del chat", () => {
    expect(noLeidasDoContato({ messageHandling: "normal" }, 7)).toBe(7);
  });

  it("un contacto silenciado nunca suma no leídas", () => {
    expect(noLeidasDoContato({ messageHandling: "silent" }, 7)).toBe(0);
  });

  it("los mensajes propios nunca suman", () => {
    expect(noLeidasDoContato({ messageHandling: "normal" }, 7, true)).toBe(0);
    expect(noLeidasDoContato({ messageHandling: "ignore" }, 7, true)).toBe(0);
  });

  it("un valor inválido o negativo del chat cuenta como cero", () => {
    expect(noLeidasDoContato({ messageHandling: "normal" }, NaN)).toBe(0);
    expect(noLeidasDoContato({ messageHandling: "normal" }, -3)).toBe(0);
    expect(noLeidasDoContato(null, undefined as any)).toBe(0);
  });
});
