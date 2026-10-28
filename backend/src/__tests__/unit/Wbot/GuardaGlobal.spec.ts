// Regresión: la guarda global `CheckMsgIsGroup` descartaba también los stickers.
// Con el ajuste activo (como en producción) un sticker de un chat individual no
// se guardaba nunca: se veía en WhatsApp y no en el panel.
import { mensagemDescartadaPelaGuardaGlobal } from "../../../helpers/MessageHandling";

const chatIndividual = { from: "5491155667788@c.us", chatIsGroup: false };

describe("guarda global CheckMsgIsGroup", () => {
  it("no descarta un sticker de un chat individual", () => {
    expect(
      mensagemDescartadaPelaGuardaGlobal(
        { ...chatIndividual, type: "sticker" },
        true
      )
    ).toBe(false);
  });

  it("no descarta el resto de los mensajes de un chat individual", () => {
    ["chat", "image", "audio", "video", "document", "location"].forEach(type => {
      expect(
        mensagemDescartadaPelaGuardaGlobal({ ...chatIndividual, type }, true)
      ).toBe(false);
    });
  });

  it("descarta los mensajes de grupos", () => {
    expect(
      mensagemDescartadaPelaGuardaGlobal(
        { from: "120363000000000000@g.us", chatIsGroup: true, type: "sticker" },
        true
      )
    ).toBe(true);
  });

  it("descarta estados y notificaciones internas", () => {
    expect(
      mensagemDescartadaPelaGuardaGlobal(
        { from: "status@broadcast", type: "image" },
        true
      )
    ).toBe(true);

    ["e2e_notification", "notification_template"].forEach(type => {
      expect(
        mensagemDescartadaPelaGuardaGlobal({ ...chatIndividual, type }, true)
      ).toBe(true);
    });
  });

  it("con el ajuste apagado no descarta nada, ni siquiera grupos", () => {
    expect(
      mensagemDescartadaPelaGuardaGlobal(
        { from: "120363000000000000@g.us", chatIsGroup: true, type: "chat" },
        false
      )
    ).toBe(false);

    expect(
      mensagemDescartadaPelaGuardaGlobal(
        { from: "status@broadcast", type: "image" },
        false
      )
    ).toBe(false);
  });
});
