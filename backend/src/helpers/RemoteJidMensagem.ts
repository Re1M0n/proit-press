import { logger } from "../utils/logger";

/**
 * Normaliza el `remoteJid` de un mensaje de WhatsApp para poder guardarlo en
 * `Messages.remoteJid` (columna STRING).
 *
 * Por qué existe: el listener guardaba `id.remote` a secas. En la era LID esa
 * propiedad puede venir como objeto (`Wid`), no como texto, y Sequelize aborta
 * la validación con `string violation: remoteJid cannot be an array or an
 * object`. Como el error ocurre dentro del `upsert`, **el mensaje completo se
 * pierde**: no queda en el panel (~80 mensajes por día en producción).
 *
 * El mismo criterio estaba copiado a mano en los cinco lugares que escriben
 * `remoteJid`, así que cualquiera de ellos podía romper. Acá queda en un solo
 * lugar, tolerante a texto, Wid objeto (`_serialized` o `user`+`server`) y
 * basura (arrays, números, null).
 */

const resumirValor = (valor: unknown): string => {
  if (valor === null) return "null";
  if (Array.isArray(valor)) return `array(${valor.length})`;
  if (typeof valor !== "object") return String(valor);
  try {
    return JSON.stringify(valor).slice(0, 200);
  } catch (err) {
    return "[no serializable]";
  }
};

const origenesYaAvisados = new Set<string>();

/**
 * Deja constancia (una sola vez por origen y por proceso) de que llegó un valor
 * no textual. Sirve para saber qué camino del código manda el Wid objeto sin
 * llenar el log en cada mensaje.
 */
const avisarValorNoTextual = (
  origen: string,
  remote: unknown,
  resultado: string | null
) => {
  if (origenesYaAvisados.has(origen)) {
    return;
  }
  origenesYaAvisados.add(origen);

  logger.warn(
    `[remoteJid] valor no textual recibido de ${origen}; normalizado a ${resultado ||
      "null"}`,
    {
      origen,
      tipo: Array.isArray(remote) ? "array" : typeof remote,
      valor: resumirValor(remote)
    }
  );
};

/**
 * Devuelve el jid como texto, o null si el valor no es representable.
 * Acepta el texto directo y el Wid objeto (`_serialized`, o `user`+`server`).
 */
export const sanitizarRemoteJid = (valor: unknown): string | null => {
  if (typeof valor === "string") {
    return valor.length > 0 ? valor : null;
  }

  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    const wid = valor as { _serialized?: unknown; user?: unknown; server?: unknown };
    if (typeof wid._serialized === "string" && wid._serialized.length > 0) {
      return wid._serialized;
    }
    if (
      typeof wid.user === "string" &&
      wid.user.length > 0 &&
      typeof wid.server === "string" &&
      wid.server.length > 0
    ) {
      return `${wid.user}@${wid.server}`;
    }
  }

  return null;
};

/**
 * Remote jid de un mensaje de wwebjs: primero `id.remote` y, si no sirve, el
 * segundo tramo de `id._serialized` (formato `<fromMe>_<remote>_<id>`).
 */
const remoteJidDoMensagem = (
  mensagem: any,
  origem = "desconhecida"
): string | null => {
  const id = mensagem?.id;
  if (!id) {
    return null;
  }

  const desdeRemote = sanitizarRemoteJid(id.remote);
  if (desdeRemote) {
    if (typeof id.remote !== "string") {
      avisarValorNoTextual(origem, id.remote, desdeRemote);
    }
    return desdeRemote;
  }

  if (typeof id._serialized === "string") {
    const tramos = id._serialized.split("_");
    if (tramos.length >= 2 && tramos[1]) {
      if (id.remote !== undefined) {
        avisarValorNoTextual(origem, id.remote, tramos[1]);
      }
      return tramos[1];
    }
  }

  if (id.remote !== undefined) {
    avisarValorNoTextual(origem, id.remote, null);
  }
  return null;
};

export default remoteJidDoMensagem;
