import { QueryInterface } from "sequelize";

// `Contacts.number` quedó con dos índices únicos idénticos sobre la misma columna:
//
//   number    el que creó createTable en 20200717144403-create-contacts
//   number_2  el que agregó de más 20240924161124-change-column-number-to-allownull,
//             cuyo `up` pidió changeColumn({ unique: true }) sin borrar el anterior.
//             MariaDB no reutiliza el índice que ya existe: agrega uno nuevo y le
//             pone el sufijo `_2`.
//
// Ninguno aporta nada que el otro no dé: los dos son UNIQUE KEY sobre (number), los
// dos nullable. Esta migración borra el que agregó el alter de 2024 y conserva
// `number`, que es el nombre que sale del propio modelo (`Contact.number` es
// `@Unique`), así el esquema queda como si el duplicado nunca se hubiera agregado.
//
// No deja la columna sin unicidad: sólo borra `number_2` si `number` está presente.
// Si `number` no estuviera (esquema desviado por DDL manual), no toca nada en vez de
// quedarse sin ninguna restricción única sobre el número de contacto.
//
// Verificado en MariaDB 10.11 antes de escribirlo:
//   - el DROP INDEX es INPLACE (pasa con `ALGORITHM=INPLACE, LOCK=NONE`), o sea online:
//     no reconstruye Contacts ni bloquea escrituras mientras corre;
//   - con `number` en pie, insertar un duplicado sigue fallando con ER_DUP_ENTRY, así
//     que borrar el gemelo no cambia la semántica;
//   - ninguna FK se apoya en este índice: las seis que apuntan a Contacts
//     (Tickets, ClientContacts, ContactCustomFields, Messages, Reminders, ContactTags)
//     usan Contacts.id, no Contacts.number.
//
// Es idempotente en las dos direcciones.
const KEPT = "number";
const REDUNDANT = "number_2";

const uniqueIndexesOnNumber = async (
  queryInterface: QueryInterface
): Promise<string[]> => {
  const [rows]: any = await queryInterface.sequelize.query(
    `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Contacts'
        AND COLUMN_NAME = '${KEPT}'
        AND NON_UNIQUE = 0;`
  );

  return rows.map((row: { INDEX_NAME: string }) => row.INDEX_NAME);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const names = await uniqueIndexesOnNumber(queryInterface);

    if (!names.includes(REDUNDANT) || !names.includes(KEPT)) {
      return;
    }

    await queryInterface.removeIndex("Contacts", REDUNDANT);
  },

  down: async (queryInterface: QueryInterface) => {
    const names = await uniqueIndexesOnNumber(queryInterface);

    if (names.includes(REDUNDANT) || !names.includes(KEPT)) {
      return;
    }

    await queryInterface.addIndex("Contacts", [KEPT], {
      unique: true,
      name: REDUNDANT
    });
  }
};
