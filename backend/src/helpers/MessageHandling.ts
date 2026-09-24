/**
 * Manejo de mensajes por contacto.
 *
 * Por qué existe: la guarda global `CheckMsgIsGroup` es todo-o-nada (ignora
 * *todos* los stickers y *todos* los grupos) y no cubre los casos que aparecen
 * en producción: canales de difusión (@newsletter, que no son grupos), números
 * que mandan promociones y contactos que no necesitan generar ticket.
 *
 * Acá queda el criterio por contacto, definido desde el modal del contacto:
 *   - "normal": flujo completo (crea/actualiza ticket y cuenta como no leída).
 *   - "silent": se recibe y se guarda en el historial, pero no sube el contador
 *               de no leídas (sirve para números que solo avisan cosas).
 *   - "ignore": el mensaje se descarta; no se crea ticket ni se guarda nada.
 */

export type MessageHandlingMode = "normal" | "silent" | "ignore";

export const MESSAGE_HANDLING_MODES: MessageHandlingMode[] = [
  "normal",
  "silent",
  "ignore"
];

export const MESSAGE_HANDLING_PADRAO: MessageHandlingMode = "normal";

/**
 * Convierte cualquier valor que venga de la base o del request en un modo
 * válido. Lo desconocido cae en "normal" para no silenciar contactos por
 * accidente (el peor error posible acá sería perder mensajes de un cliente).
 */
export const normalizarMessageHandling = (
  valor?: string | null
): MessageHandlingMode => {
  const normalizado =
    typeof valor === "string" ? valor.trim().toLowerCase() : "";

  return (MESSAGE_HANDLING_MODES as string[]).includes(normalizado)
    ? (normalizado as MessageHandlingMode)
    : MESSAGE_HANDLING_PADRAO;
};

type ContatoComManejo = { messageHandling?: string | null } | null | undefined;

/** true cuando el contacto está configurado para descartar mensajes. */
export const contatoIgnoraMensagens = (contato: ContatoComManejo): boolean =>
  normalizarMessageHandling(contato?.messageHandling) === "ignore";

/** true cuando el contacto recibe mensajes pero sin contador de no leídas. */
export const contatoSilenciado = (contato: ContatoComManejo): boolean =>
  normalizarMessageHandling(contato?.messageHandling) === "silent";

/**
 * Cuántos mensajes no leídos debe acumular el ticket para este contacto.
 * "silent" y los mensajes propios nunca suman.
 */
export const noLeidasDoContato = (
  contato: ContatoComManejo,
  jaNaoLidas: number,
  fromMe = false
): number => {
  if (fromMe || contatoSilenciado(contato)) {
    return 0;
  }

  return Number.isFinite(jaNaoLidas) && jaNaoLidas > 0 ? jaNaoLidas : 0;
};
