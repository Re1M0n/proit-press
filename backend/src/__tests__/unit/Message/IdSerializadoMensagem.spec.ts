import idSerializado from "../../../helpers/IdSerializadoMensagem";

/**
 * Regresión: en la era LID el _serialized de wwebjs puede venir vacío y el id
 * interno ($1) es el que WhatsApp reconoce. Si no se resuelve ninguno, la cita
 * del mensaje se descarta en silencio.
 */
describe("idSerializado", () => {
  it("prefiere el id interno ($1)", () => {
    expect(
      idSerializado({
        id: { $1: "true_259407518666984@lid_3EB0AA", _serialized: "false_54911@c.us_3EB0AA" }
      } as any)
    ).toBe("true_259407518666984@lid_3EB0AA");
  });

  it("cae al _serialized cuando no hay $1", () => {
    expect(
      idSerializado({ id: { _serialized: "false_54911@c.us_3EB0AA" } } as any)
    ).toBe("false_54911@c.us_3EB0AA");
  });

  it("devuelve undefined si no hay ningún id utilizable", () => {
    expect(idSerializado({ id: {} } as any)).toBeUndefined();
    expect(idSerializado({ id: { $1: "", _serialized: undefined } } as any)).toBeUndefined();
    expect(idSerializado(null)).toBeUndefined();
    expect(idSerializado(undefined)).toBeUndefined();
  });
});
