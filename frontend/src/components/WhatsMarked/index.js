import React from "react";
import WhatsMarkedRaw from "react-whatsmarked";

/**
 * Link "suelto" (sin esquema) que empieza con www. en cualquier combinación de
 * mayúsculas y minúsculas.
 */
const BARE_WWW = /(^|[\s([{<"'«“,;:])(www\.[^\s<>()"'«»,]+)/gi;

/**
 * react-whatsmarked 0.9.14 sólo convierte el link en absoluto cuando el prefijo
 * es exactamente "www." en minúsculas (`www.` === token). Con "Www.anydesk.com"
 * o "WWW.anydesk.com" deja el href tal cual y el navegador lo resuelve como
 * ruta RELATIVA sobre la página actual: dentro de un ticket (/tickets/2011) el
 * click abre /tickets/Www.anydesk.com, y el panel intenta cargar un ticket con
 * ese "id" (404 + toast de error) en vez de abrir la web.
 *
 * Acá se completa el esquema antes de renderizar. No toca lo que ya trae
 * esquema (en "http://www.x.com" el "www." está precedido por "/") ni el texto
 * que no es un link.
 */
export const absolutizarLinks = (texto) =>
  typeof texto === "string"
    ? texto.replace(BARE_WWW, (_match, prefijo, url) => `${prefijo}http://${url}`)
    : texto;

const WhatsMarked = ({ children, ...props }) => (
  <WhatsMarkedRaw {...props}>{absolutizarLinks(children)}</WhatsMarkedRaw>
);

export default WhatsMarked;
