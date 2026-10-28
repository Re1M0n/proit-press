import { QueryInterface } from "sequelize";

// `Contacts.nameManuallyEdited` difiere en nulabilidad:
//
//   cadena de migraciones (20260115221500-add-nameManuallyEdited-to-contacts)
//       BOOLEAN NOT NULL DEFAULT false
//   producción
//       TINYINT(1) NULL DEFAULT 0
//
// Dirección elegida: NOT NULL, o sea el lado de las migraciones.
//
// Acá no es una cuestión de gusto, como en los largos: la columna responde "¿el
// nombre se editó a mano?", el modelo la declara `@Default(false)` y el código la usa
// como booleano (`!contact.nameManuallyEdited`). NULL no es un tercer estado con
// significado —nadie lo escribe— sino un hueco que sólo puede aparecer por DDL manual
// o por un INSERT que omita la columna sin default. La definición estricta es la
// correcta; la de producción es la floja.
//
// Medido en producción antes de escribirlo (solo lectura):
//   - 0 filas con nameManuallyEdited en NULL
//   - valores presentes: 268 en 0, 16 en 1
// Así que el ALTER no falla por datos y no reinterpreta ninguna fila.
//
// Comprobado en la base de test con una fila en NULL: MariaDB en modo estricto
// corta con "Data truncated for column 'nameManuallyEdited'", el ALTER no se aplica
// y el deploy se frena. Es el comportamiento buscado: si apareciera un NULL entre la
// medición y el deploy, mejor que falle a que invente un valor.
//
// Ojo con el `down`: deja la columna nullable, que es el estado del que parte el `up`
// en producción. En una base creada de cero la cadena ya la dejaba NOT NULL, así que
// ahí el `down` la afloja: no hay un único estado previo porque esta migración existe
// justamente porque los dos lados diferían. Se eligió que `down` sea el inverso
// literal del `up` para que `db:migrate:undo:all` siga completando.
const TABLE = "Contacts";
const COLUMN = "nameManuallyEdited";

// COLUMN_TYPE | IS_NULLABLE | COLUMN_DEFAULT
const NULLABLE = "tinyint(1)|YES|0";
const NOT_NULL = "tinyint(1)|NO|0";

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
    if ((await current(queryInterface)) === NOT_NULL) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` TINYINT(1) NOT NULL DEFAULT 0;`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    if ((await current(queryInterface)) === NULLABLE) {
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE}\` MODIFY COLUMN \`${COLUMN}\` TINYINT(1) NULL DEFAULT 0;`
    );
  }
};
