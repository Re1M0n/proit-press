import { QueryInterface } from "sequelize";

// El índice que sostiene la FK de `Tickets.queueId` quedó con el nombre de la
// constraint que borró 20261027130000-deduplicate-queueId-foreign-key-on-tickets:
//
//   KEY `Tickets_queueId_custom_foreign` (`queueId`)                  <- el índice real
//   CONSTRAINT `Tickets_queueId_foreign_idx` FOREIGN KEY (`queueId`)  <- la FK viva
//
// O sea, el nombre del índice referencia una constraint que ya no existe. Acá se lo
// renombra al de la FK que efectivamente sostiene, para que el par quede consistente
// (igual que `Tickets_whatsappId_foreign_idx`, donde KEY y CONSTRAINT comparten
// nombre). Sin esto, el índice sigue apareciendo como huérfano en cualquier auditoría
// de esquema.
//
// Sequelize 5.22 no expone queryInterface.renameIndex, así que va con SQL directo.
// Verificado en MariaDB 10.11 antes de escribirlo:
//   - RENAME INDEX es una operación de metadatos (pasa con ALGORITHM=INSTANT y sin
//     warnings), así que en producción no reconstruye Tickets;
//   - renombrar el índice no toca la FK que se apoya en él (el DDL queda con la KEY
//     y la CONSTRAINT con el mismo nombre, sin conflicto: es el mismo caso que
//     Tickets_whatsappId_foreign_idx).
//
// Es idempotente en las dos direcciones: si el índice ya tiene el nombre destino, o
// si no está el de origen, no hace nada.
const OLD_NAME = "Tickets_queueId_custom_foreign";
const NEW_NAME = "Tickets_queueId_foreign_idx";

const queueIdIndexNames = async (
  queryInterface: QueryInterface
): Promise<string[]> => {
  const [rows]: any = await queryInterface.sequelize.query(
    `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Tickets'
        AND COLUMN_NAME = 'queueId';`
  );

  return rows.map((row: { INDEX_NAME: string }) => row.INDEX_NAME);
};

const renameQueueIdIndex = (
  queryInterface: QueryInterface,
  from: string,
  to: string
) =>
  queryInterface.sequelize.query(
    `ALTER TABLE \`Tickets\` RENAME INDEX \`${from}\` TO \`${to}\`;`
  );

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const names = await queueIdIndexNames(queryInterface);

    if (!names.includes(OLD_NAME) || names.includes(NEW_NAME)) {
      return;
    }

    await renameQueueIdIndex(queryInterface, OLD_NAME, NEW_NAME);
  },

  down: async (queryInterface: QueryInterface) => {
    const names = await queueIdIndexNames(queryInterface);

    if (!names.includes(NEW_NAME) || names.includes(OLD_NAME)) {
      return;
    }

    await renameQueueIdIndex(queryInterface, NEW_NAME, OLD_NAME);
  }
};
