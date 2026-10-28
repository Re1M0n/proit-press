import { QueryInterface } from "sequelize";

// `ActivityLogs.ip` tiene dos largos según por dónde se creó la base:
//
//   cadena de migraciones (20251128104200-add-ip-to-activity-logs)  VARCHAR(255),
//       porque ahí se pidió DataTypes.STRING sin largo y ese es el default
//   producción                                                      VARCHAR(45)
//
// No es una diferencia funcional —las dos guardan la misma IP— pero rompe la
// reproducibilidad: una base creada de cero no queda igual a producción, y cualquier
// comparación de esquemas marca una diferencia que hay que revisar a mano cada vez.
//
// Dirección elegida: 45, o sea el lado de producción.
//
// El motivo es que 45 no es un número arbitrario, es el largo máximo real de una
// dirección en texto: la IPv4 mapeada a IPv6, "::ffff:255.255.255.255", mide 45
// caracteres y no existe representación válida más larga. El 255 de la migración no
// fue una decisión sino el default del ORM.
//
// Medido en producción antes de escribirlo (solo lectura):
//   - 73 filas con ip en NULL
//   - largo máximo observado: 39
//   - 171 filas con IPv6 (las que tienen dos puntos)
// Ninguna se acerca a 45, así que el estrechamiento no puede truncar nada. Si
// apareciera una fila más larga, MariaDB en modo estricto hace fallar el ALTER y el
// deploy se corta —que es lo que se quiere— en vez de truncar en silencio.
//
// Idempotente en las dos direcciones: si la columna ya tiene el largo buscado, no
// ejecuta DDL (importa en producción, donde ya está en 45 y esta migración no debe
// reconstruir ActivityLogs para no cambiar nada).
const TABLE = "ActivityLogs";
const COLUMN = "ip";

// COLUMN_TYPE | IS_NULLABLE | COLUMN_DEFAULT
const NARROW = "varchar(45)|YES|<null>";
const WIDE = "varchar(255)|YES|<null>";

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
    if ((await current(queryInterface)) === NARROW) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` VARCHAR(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    if ((await current(queryInterface)) === WIDE) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;`
    );
  }
};
