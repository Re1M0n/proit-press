import camposDefinidos from "../../../helpers/CamposDefinidos";

/**
 * Regresión: el listener de WhatsApp reescribe con upsert la fila que el panel
 * acaba de crear. Si esa segunda escritura incluye quotedMsgId undefined,
 * Sequelize lo traduce a NULL y la cita del mensaje desaparece.
 */
describe("camposDefinidos", () => {
  it("descarta las claves undefined (no deben llegar al upsert)", () => {
    const resultado = camposDefinidos({
      id: "3EB0A8810F1A3F0A3C39DC",
      body: "Prueba de cita",
      quotedMsgId: undefined,
      remoteJid: "259407518666984@lid",
      fileSize: null
    });

    expect(Object.keys(resultado)).not.toContain("quotedMsgId");
    expect(resultado).toEqual({
      id: "3EB0A8810F1A3F0A3C39DC",
      body: "Prueba de cita",
      remoteJid: "259407518666984@lid",
      fileSize: null
    });
  });

  it("conserva los valores falsy y el null explícito", () => {
    const resultado = camposDefinidos({
      fromMe: false,
      read: 0,
      ack: null,
      body: "",
      contactId: undefined
    });

    expect(resultado).toEqual({
      fromMe: false,
      read: 0,
      ack: null,
      body: ""
    });
  });

  it("no muta el objeto original y devuelve otra referencia", () => {
    const original = {
      id: "1",
      quotedMsgId: undefined as unknown as string
    };

    const resultado = camposDefinidos(original);

    expect(resultado).not.toBe(original);
    expect(original).toHaveProperty("quotedMsgId");
    expect(Object.keys(resultado)).toEqual(["id"]);
  });
});
