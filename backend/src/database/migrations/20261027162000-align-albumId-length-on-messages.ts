import { QueryInterface } from "sequelize";

// `Messages.albumId` tiene dos largos según por dónde se creó la base:
//
//   cadena de migraciones (20251024000000-add-albumId-to-messages)  VARCHAR(255),
//       porque ahí se pidió DataTypes.STRING sin largo
//   producción                                                      VARCHAR(500)
//
// Dirección elegida: 500, o sea el lado de producción.
//
// Al revés que con `ip`, acá no hay un número "correcto" deducible del dominio: el
// albumId es un identificador opaco que arma el backend como
// `${msg.from}_${timestamp redondeado a 5s}` (verifyMediaMessage), y hoy no llega ni
// cerca del límite. Medido en producción (solo lectura): 15 222 filas en NULL y largo
// máximo 30.
//
// Entre dos valores que funcionan se elige el de producción por una razón práctica:
// ensanchar una base creada de cero es gratis y no puede fallar, mientras que
// estrechar producción a 255 exige confiar en que ningún albumId futuro pase de ahí y
// convierte un cambio de esquema en una bomba para el primer insert largo. No se gana
// nada angostando.
//
// El `down` vuelve a 255, que es lo que produce la cadena. Si alguna fila superara los
// 255 caracteres el `down` falla en modo estricto en vez de truncar; hoy no existe
// ninguna.
//
// Idempotente en las dos direcciones.
const TABLE = "Messages";
const COLUMN = "albumId";

// COLUMN_TYPE | IS_NULLABLE | COLUMN_DEFAULT
const WIDE = "varchar(500)|YES|<null>";
const NARROW = "varchar(255)|YES|<null>";

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
    if ((await current(queryInterface)) === WIDE) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    if ((await current(queryInterface)) === NARROW) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;`
    );
  }
};
