import database from "../../database";

// MySQL no permite TRUNCATE sobre tablas referenciadas por claves foráneas
// (el cascade de Sequelize es de Postgres). Para truncar todas las tablas:
//  1. Tomamos UNA conexión del pool (así el SET FOREIGN_KEY_CHECKS aplica
//     a la misma conexión que ejecuta los TRUNCATE — si se mezclan conexiones
//     del pool, el setting no aplica y vuelve a fallar).
//  2. Deshabilitamos FK checks, truncamos cada tabla, y restauramos.
const truncate = async (): Promise<void> => {
  const connection = await database.connectionManager.getConnection();
  const run = (sql: string): Promise<void> =>
    new Promise((resolve, reject) => {
      connection.query(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

  try {
    await run("SET FOREIGN_KEY_CHECKS = 0");
    const tables = Object.values(database.models).map(model => model.tableName);
    for (const table of tables) {
      await run(`TRUNCATE TABLE \`${table}\``);
    }
    await run("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    database.connectionManager.releaseConnection(connection);
  }
};

const disconnect = async (): Promise<void> => {
  return database.connectionManager.close();
};

export { truncate, disconnect };
