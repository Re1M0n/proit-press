/**
 * Devuelve una copia del objeto sin las claves cuyo valor es `undefined`.
 *
 * Por qué existe: `Message.upsert()` es un `INSERT ... ON DUPLICATE KEY UPDATE`
 * y Sequelize escribe NULL en toda columna que llegue con `undefined` (a
 * diferencia de `update()`, que las ignora). El listener de WhatsApp
 * (verifyMessage / verifyMediaMessage) reescribe la misma fila que el envío del
 * panel acaba de crear y, como no siempre conoce el mensaje citado, mandaba
 * `quotedMsgId: undefined` y borraba la cita que el panel sí había guardado: el
 * mensaje salía bien de WhatsApp pero el panel lo mostraba sin cita.
 *
 * Los llamadores que quieran limpiar una columna tienen que pasar `null`
 * explícito (como hace SendPollService con `quotedMsgId`).
 */
const camposDefinidos = <T extends Record<string, unknown>>(datos: T): T => {
  const resultado = {} as T;
  const destino = resultado as Record<string, unknown>;

  Object.keys(datos).forEach(clave => {
    if (datos[clave] !== undefined) {
      destino[clave] = datos[clave];
    }
  });

  return resultado;
};

export default camposDefinidos;
