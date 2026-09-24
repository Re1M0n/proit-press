/**
 * Links que llegan escritos "a mano" en los mensajes.
 *
 * react-whatsmarked 0.9.14 sólo completa el esquema cuando el link empieza con
 * "www." exactamente en minúsculas. Con "Www.anydesk.com" o "WWW.anydesk.com"
 * genera <a href="Www.anydesk.com">: un href RELATIVO que el navegador resuelve
 * sobre la ruta actual, así que dentro de un ticket (/tickets/2011) el click
 * termina abriendo /tickets/Www.anydesk.com y el panel intenta cargar un ticket
 * con ese "id" en lugar de abrir la web.
 *
 * Acá queda el criterio de qué hrefs hay que arreglar. No se reescribe el texto
 * visible: sólo el destino del link.
 */

/** Ya trae esquema (http:, https:, mailto:, tel:...) o es una ruta interna. */
const YA_ABSOLUTO = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Tiene forma de dominio suelto: "Www.anydesk.com", "nic.ar", "www.x.com/a?b=1".
 * Deliberadamente no acepta cosas como "TKT-0001/estado" (sin dominio), que se
 * dejan como estaban para no inventar un destino.
 */
const DOMINIO_SUELTO = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

/** Esquema por defecto, el mismo criterio que una barra de direcciones actual. */
export const ESQUEMA_PADRAO = "https://";

/**
 * Devuelve la url absoluta para un href que viene sin esquema, o null si el
 * href no necesita (o no debe) tocarse.
 */
export const urlAbsolutaConEsquema = (href) => {
  if (typeof href !== "string") return null;

  const limpio = href.trim();
  if (!limpio) return null;
  if (YA_ABSOLUTO.test(limpio)) return null;
  if (limpio.startsWith("/") || limpio.startsWith("#")) return null;
  if (!DOMINIO_SUELTO.test(limpio)) return null;

  return `${ESQUEMA_PADRAO}${limpio}`;
};
