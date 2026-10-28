import { QueryInterface } from "sequelize";

// `Tickets.queueId` quedó con dos claves foráneas idénticas (las dos apuntan a
// Queues(id) con ON DELETE SET NULL / ON UPDATE CASCADE):
//
//   Tickets_queueId_foreign_idx     la que creó Sequelize al agregar la columna
//                                   en 20210108164504-add-queueId-to-tickets
//   Tickets_queueId_custom_foreign  la que agregó de más 20240921153422, cuyo `up`
//                                   nunca borró la anterior
//
// Esta migración deja una sola: borra la que agregó el alter de 2024 y conserva la
// del nombre que Sequelize genera solo, así el esquema queda como si el duplicado
// nunca se hubiera agregado.
//
// Es idempotente y no deja la columna sin protección: si la FK que se conserva no
// está, o la redundante ya no está, no toca nada.
//
// El índice sobre queueId (llamado `Tickets_queueId_custom_foreign`) NO se borra:
// MariaDB lo deja en pie al caer la constraint y pasa a sostener la FK que queda.
// Borrarlo fallaría mientras esa FK exista ("Cannot drop index ...: needed in a
// foreign key constraint"), y renombrarlo costaría un índice nuevo en producción
// sin ganar nada: el nombre del índice no lo usa nadie.
//
// Verificado además que en MariaDB 10.11 el DROP FOREIGN KEY es una operación
// INPLACE (`ALTER TABLE ... DROP FOREIGN KEY ..., ALGORITHM=INPLACE` sin warnings),
// así que en producción no reconstruye la tabla.
const KEPT = "Tickets_queueId_foreign_idx";
const REDUNDANT = "Tickets_queueId_custom_foreign";

const foreignKeysOnQueueId = async (
  queryInterface: QueryInterface
): Promise<string[]> => {
  const [rows]: any = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Tickets'
        AND COLUMN_NAME = 'queueId'
        AND REFERENCED_TABLE_NAME IS NOT NULL;`
  );

  return rows.map((row: { CONSTRAINT_NAME: string }) => row.CONSTRAINT_NAME);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const names = await foreignKeysOnQueueId(queryInterface);

    if (!names.includes(KEPT) || !names.includes(REDUNDANT)) {
      return;
    }

    await queryInterface.removeConstraint("Tickets", REDUNDANT);
  },

  down: async (queryInterface: QueryInterface) => {
    const names = await foreignKeysOnQueueId(queryInterface);

    if (names.includes(REDUNDANT) || !names.includes(KEPT)) {
      return;
    }

    await queryInterface.addConstraint("Tickets", ["queueId"], {
      type: "foreign key",
      name: REDUNDANT,
      references: {
        table: "Queues",
        field: "id"
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });
  }
};
