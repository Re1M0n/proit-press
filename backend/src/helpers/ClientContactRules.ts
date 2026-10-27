export const CONTACT_TYPE_CLIENT = "client";
export const CONTACT_TYPE_EXTERNAL = "external";

/** Cualquier valor que no sea "external" se trata como cliente. */
export const normalizarContactType = (valor?: string): string =>
  String(valor || "").trim().toLowerCase() === CONTACT_TYPE_EXTERNAL
    ? CONTACT_TYPE_EXTERNAL
    : CONTACT_TYPE_CLIENT;

/**
 * Un contacto tipo cliente sólo puede estar en una ficha: si ya está en otra, no
 * se vincula (se avisa con error en vez de reasignarlo en silencio). Un externo
 * puede estar en las fichas que haga falta.
 *
 * `otrasFichas` son los ids de las fichas distintas a la que se está editando.
 */
export const puedeVincularse = (
  contactType: string,
  otrasFichas: number[]
): boolean => {
  if (normalizarContactType(contactType) === CONTACT_TYPE_EXTERNAL) {
    return true;
  }

  return otrasFichas.length === 0;
};
