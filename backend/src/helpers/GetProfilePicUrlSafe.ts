/**
 * Obtiene la URL de la foto de perfil de un JID (teléfono, LID o grupo).
 *
 * La ruta estándar `wbot.getProfilePicUrl` pasa por `WWebJS.getChat` con
 * `getAsModel: true`, que en la versión actual de WhatsApp Web revienta con
 * `DataError: Failed to execute 'get' on 'IDBObjectStore': No key or key range
 * specified` (tanto para chats guardados bajo LID como para números comunes),
 * por eso el frontend no muestra las fotos. Acá pedimos el chat crudo
 * (getAsModel: false) y usamos el bridge de fotos directamente, que resuelve
 * el LID correctamente.
 */
const getProfilePicUrlSafe = async (
  wbot: any,
  jid: string
): Promise<string | undefined> => {
  if (!jid) return undefined;

  try {
    if (wbot?.pupPage) {
      const eurl = await wbot.pupPage.evaluate((contactId: string) => {
        const waw = window as any;
        return waw.WWebJS.getChat(contactId, {
          getAsModel: false
        })
          .then((chat: any) => {
            if (!chat) return null;
            return waw
              .require("WAWebContactProfilePicThumbBridge")
              .requestProfilePicFromServer(chat)
              .then((pic: any) => (pic && pic.eurl ? pic.eurl : null));
          })
          .catch(() => null);
      }, jid);
      if (eurl) return eurl;
    }
  } catch (evalErr) {
    // puente no disponible; seguimos con la ruta estándar
  }

  try {
    const url = await wbot.getProfilePicUrl(jid);
    return url || undefined;
  } catch (err) {
    return undefined;
  }
};

export default getProfilePicUrlSafe;
