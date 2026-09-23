#!/usr/bin/env node
/*
 * Parches locales de whatsapp-web.js.
 *
 * Por qué existe: hay bugs de whatsapp-web.js 1.34.7 que rompen funciones del
 * panel (envío de media, edición) y todavía no tienen release con el fix. Hasta
 * ahora esos arreglos se aplicaban a mano dentro de node_modules y se perdían
 * en cualquier instalación limpia (npm ci), sin quedar registrados en ningún
 * lado. Este script los deja versionados, aplicables e idempotentes.
 *
 * Uso:
 *   node scripts/patch-wwebjs.js           # aplica lo que falte (lo llama postinstall)
 *   node scripts/patch-wwebjs.js --check   # solo verifica; sale con código 1 si falta alguno
 *
 * Es seguro correrlo muchas veces: si el parche ya está, no toca el archivo.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const NODE_MODULES = path.resolve(__dirname, "..", "node_modules");
const checkOnly = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");

const log = message => {
  if (!quiet) {
    console.log(`[patch-wwebjs] ${message}`);
  }
};

/*
 * Cada parche declara:
 *  - id:          nombre corto para los logs
 *  - file:        ruta dentro de node_modules
 *  - marker:      cadena que, si existe, indica que el parche ya está aplicado
 *  - description: por qué hace falta
 *  - apply:       recibe el contenido y devuelve el nuevo (o null si no encontró el ancla)
 */
const PATCHES = [
  {
    id: "media-xid",
    file: "whatsapp-web.js/src/util/Injected/Utils.js",
    marker: "delete message.__x_id;",
    description:
      "1.34.7: mediaOptions trae __x_id y al esparcirlo en el Msg saliente pisa su id; getValidatedSender() falla con 'Data passed to getter must include an id property (it's how we memoize) but got undefined' y TODO envío de imagen/video/audio responde 400 (upstream #201921/#201922, PR #201923).",
    apply(source) {
      const anchor = "        // Bot's won't reply if canonicalUrl is set (linking)";
      if (!source.includes(anchor)) {
        return null;
      }
      const injection = [
        "        // MediaData es un modelo cuyo campo privado __x_id colisiona con el",
        "        // id interno del Msg cuando se esparcen sus propiedades enumerables",
        "        // arriba; eso rompe getValidatedSender() durante la inicialización.",
        "        // Solo afecta a los mensajes con media: el texto no pasa por acá.",
        "        delete message.__x_id;",
        "",
        anchor
      ].join("\n");
      return source.replace(anchor, injection);
    }
  },
  {
    id: "send-return-id",
    file: "whatsapp-web.js/src/util/Injected/Utils.js",
    marker: "const lookupId = newMsgKey['$1'] || newMsgKey._serialized;",
    description:
      "sendMessage: el id de la clave recién creada no se resuelve con _serialized, así que el envío devuelve undefined aunque el mensaje SE ENTREGUE. Con media el panel lo interpretaba como error (500/400) y no guardaba la fila. Ahora se usa el id interno ($1) y, si tampoco hay, se devuelve undefined sin tirar 'Data passed to getter'.",
    apply(source) {
      const anchor =
        "        return window\n            .require('WAWebCollections')\n            .Msg.get(newMsgKey._serialized);";
      if (!source.includes(anchor)) {
        return null;
      }
      const replacement = [
        "        // El id de una clave recién creada no siempre tiene _serialized en",
        "        // esta versión de WhatsApp Web: se usa el id interno ($1) y, si no",
        "        // hay ninguno, se devuelve undefined en lugar de llamar al getter",
        "        // memoizado con undefined (que tira 'Data passed to getter must",
        "        // include an id property').",
        "        const lookupId = newMsgKey['$1'] || newMsgKey._serialized;",
        "        return lookupId",
        "            ? window.require('WAWebCollections').Msg.get(lookupId)",
        "            : undefined;"
      ].join("\n");
      return source.replace(anchor, replacement);
    }
  },
  {
    id: "edit-message-id",
    file: "whatsapp-web.js/src/util/Injected/Utils.js",
    marker: "Msg.get(msg.id['$1'] || msg.id._serialized)",
    description:
      "editMessage: en la era LID el _serialized directo puede venir vacío; se usa el id interno ($1) y se cae a _serialized. Ya estaba aplicado a mano en producción.",
    apply(source) {
      const anchor =
        "        return window.require('WAWebCollections').Msg.get(msg.id._serialized);";
      if (!source.includes(anchor)) {
        return null;
      }
      const replacement =
        "        return window.require('WAWebCollections').Msg.get(msg.id['$1'] || msg.id._serialized);";
      return source.replace(anchor, replacement);
    }
  }
];

const applyPatches = () => {
  const statuses = [];

  PATCHES.forEach(patch => {
    const filePath = path.join(NODE_MODULES, patch.file);

    if (!fs.existsSync(filePath)) {
      statuses.push({ patch, status: "MISSING_FILE" });
      return;
    }

    const source = fs.readFileSync(filePath, "utf8");

    if (source.includes(patch.marker)) {
      statuses.push({ patch, status: "ALREADY" });
      return;
    }

    if (checkOnly) {
      statuses.push({ patch, status: "PENDING" });
      return;
    }

    const patched = patch.apply(source);

    if (!patched) {
      statuses.push({ patch, status: "ANCHOR_NOT_FOUND" });
      return;
    }

    fs.writeFileSync(filePath, patched, "utf8");
    statuses.push({ patch, status: "APPLIED" });
  });

  return statuses;
};

const run = () => {
  const statuses = applyPatches();
  let failures = 0;

  statuses.forEach(({ patch, status }) => {
    switch (status) {
      case "ALREADY":
        log(`ok       ${patch.id} (ya aplicado)`);
        break;
      case "APPLIED":
        log(`aplicado ${patch.id}`);
        break;
      case "PENDING":
        failures += 1;
        log(`FALTA    ${patch.id} -> ${patch.description}`);
        break;
      case "ANCHOR_NOT_FOUND":
        failures += 1;
        log(
          `FALLÓ    ${patch.id}: no se encontró el punto de inserción en ${patch.file}. ` +
            `¿Cambió la versión de whatsapp-web.js? Revisar: ${patch.description}`
        );
        break;
      case "MISSING_FILE":
        failures += 1;
        log(`FALLÓ    ${patch.id}: no existe node_modules/${patch.file}`);
        break;
      default:
        failures += 1;
        log(`FALLÓ    ${patch.id}: estado desconocido (${status})`);
    }
  });

  if (failures > 0) {
    log(
      `${failures} parche(s) sin aplicar. El envío de media y la edición de mensajes pueden fallar.`
    );
    // En modo verificación el fallo tiene que cortar el deploy; al instalar
    // (postinstall) sólo se avisa, para no romper npm por un parche ausente.
    process.exit(checkOnly ? 1 : 0);
  }

  log(`listo: ${PATCHES.length} parche(s) verificados.`);
};

run();
