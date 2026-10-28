import { QueryInterface } from "sequelize";

// `Messages.fileSize` tiene tipos distintos según por dónde se creó la base:
//
//   cadena de migraciones (20251105000000-add-fileSize-to-messages)  BIGINT
//   producción                                                      VARCHAR(255)
//
// Dirección elegida: BIGINT, o sea el lado de las migraciones. Acá no se elige por
// comodidad: producción tiene el tipo equivocado.
//
// `fileSize` es un tamaño en bytes. Se escribe desde `Buffer.from(media.data,
// "base64").length` y desde `fs.statSync().size` (verifyMediaMessage,
// SendWhatsAppMedia, SendTelegramMediaService), y el modelo lo declara `fileSize:
// number`. Guardarlo como texto deja la columna sin semántica numérica en SQL: un
// ORDER BY o una suma la ordenan lexicográficamente ('1000' < '9'). Hoy nadie la
// consulta, así que no hay un bug en curso, pero la trampa queda puesta.
//
// El ancho importa: el uploader acepta hasta 2 GiB
// (routeRegistry.ts, limits.fileSize = 2 * 1024 * 1024 * 1024 = 2 147 483 648), que
// no entra en un INT con signo (máximo 2 147 483 647). BIGINT es el primer tipo
// entero que aguanta ese caso; el `number` del modelo, si Sequelize lo infiere, daría
// INTEGER y se quedaría corto por un byte. Por eso se fija BIGINT acá y no se confía
// en la inferencia.
//
// Medido en producción antes de escribirlo (solo lectura), para probar que la
// conversión es sin pérdida:
//   - 15 976 filas, 14 660 en NULL, 1 316 con valor
//   - 1 316 son enteros, 0 no numéricos, 0 negativos
//   - largo máximo 8, valor máximo 17 578 474 (≈17 MB)
// Si existiera un solo valor no numérico, el ALTER fallaría en modo estricto y el
// deploy se cortaría; no se trunca nada en silencio.
//
// Costo: cambiar el tipo no es INPLACE, así que MariaDB copia la tabla y bloquea
// escrituras mientras corre. A este volumen son milisegundos; se corre en el deploy,
// no con tráfico alto encima.
//
// Idempotente en las dos direcciones.
const TABLE = "Messages";
const COLUMN = "fileSize";

// COLUMN_TYPE | IS_NULLABLE | COLUMN_DEFAULT
const INTEGER = "bigint(20)|YES|<null>";
const TEXT = "varchar(255)|YES|<null>";

const current = async (
  queryInterface: QueryInterface
): Promise<string | null> => {
  const [rows]: any = await queryInterface.sequelize.query(
    `SELECT COLUMN_TYPE,
            IS_NULLABLE,
            IFNULL(COLUMN_DEFAULT, '<null>') AS COLUMN_DEFAULT
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${TABLE}'
        AND COLUMN_NAME = '${COLUMN}';`
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return `${String(row.COLUMN_TYPE).toLowerCase()}|${row.IS_NULLABLE}|${
    row.COLUMN_DEFAULT
  }`;
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if ((await current(queryInterface)) === INTEGER) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` BIGINT NULL DEFAULT NULL;`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    if ((await current(queryInterface)) === TEXT) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;`
    );
  }
};
