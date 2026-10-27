import {
  CONTACT_TYPE_CLIENT,
  CONTACT_TYPE_EXTERNAL,
  normalizarContactType,
  puedeVincularse
} from "../../../helpers/ClientContactRules";

describe("ClientContactRules", () => {
  it("normaliza cualquier valor desconocido a cliente", () => {
    expect(normalizarContactType(undefined)).toBe(CONTACT_TYPE_CLIENT);
    expect(normalizarContactType("cualquiera")).toBe(CONTACT_TYPE_CLIENT);
    expect(normalizarContactType(CONTACT_TYPE_EXTERNAL)).toBe(
      CONTACT_TYPE_EXTERNAL
    );
  });

  it("un contacto tipo cliente no se vincula si ya está en otra ficha", () => {
    expect(puedeVincularse(CONTACT_TYPE_CLIENT, [7])).toBe(false);
    expect(puedeVincularse(CONTACT_TYPE_CLIENT, [])).toBe(true);
  });

  it("un contacto externo se vincula aunque esté en otras fichas", () => {
    expect(puedeVincularse(CONTACT_TYPE_EXTERNAL, [7, 9])).toBe(true);
  });
});
