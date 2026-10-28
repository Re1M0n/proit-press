#!/usr/bin/env node
/*
 * `npm test` del backend, portable y contra una base descartable.
 *
 * Por qué existe: los scripts originales (`pretest`/`posttest`/`test`) usaban
 * `NODE_ENV=test comando`. Esa sintaxis es de bash; en Windows npm ejecuta los
 * scripts con cmd.exe, que la lee como "un programa llamado NODE_ENV" y falla
 * con `"NODE_ENV" no se reconoce como un comando interno o externo`. O sea que
 * `npm test` no arrancaba nunca en Windows. Acá el entorno se arma en Node y se
 * propaga a cada hijo: mismo comportamiento, sin depender del shell y sin
 * agregar paquetes.
 *
 * Por qué recrea la base en vez de revertir migraciones (lo que hacía `posttest`):
 * este entorno es una base de test descartable, así que arrancar de cero es
 * determinista, no depende del estado que dejó la corrida anterior y es más rápido
 * que revertir toda la cadena. (`db:migrate:undo:all` también funciona: se
 * corrigieron los `down` de create-message-reactions y de
 * alter-queueId-foreign-key-on-tickets, que no completaban en MySQL/MariaDB.)
 *
 * NODE_ENV=test es lo que hace que `bootstrap.ts` lea `backend/.env.test` en
 * lugar de `.env`. Eso es lo que mantiene estas suites lejos de una base real,
 * porque el runner migra y seedea, y los specs de User/* hacen TRUNCATE de todas
 * las tablas. Si `.env.test` no existe, esto no arranca: preferimos un error
 * claro antes que apuntar a cualquier base por defecto.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const backendDir = path.join(__dirname, "..");
const binDir = path.join(backendDir, "node_modules", ".bin");
const envFile = path.join(backendDir, ".env.test");
const env = { ...process.env, NODE_ENV: "test" };

const q = value => `"${value}"`;
const bin = name =>
  path.join(binDir, process.platform === "win32" ? `${name}.cmd` : name);

const readEnvFile = () => {
  const out = {};
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};

if (!fs.existsSync(envFile)) {
  console.error(
    [
      "ERROR: falta backend/.env.test, que es lo que aísla estas suites de una base real.",
      "",
      "Levantá el entorno de test y generá el archivo con:",
      "  bash scripts/test-db.sh up        (desde la raíz del repo)",
      ""
    ].join("\n")
  );
  process.exit(1);
}

const target = readEnvFile();

// Este runner borra y recrea la base: si el nombre no parece de test, no seguimos.
if (!/_test$/.test(target.DB_NAME || "")) {
  console.error(
    `ERROR: DB_NAME="${target.DB_NAME}" no termina en _test. Este runner borra y recrea ` +
      "la base, así que solo acepta una base de test."
  );
  process.exit(1);
}

console.log(
  `Base de test: ${target.DB_USER}@${target.DB_HOST}:${target.DB_PORT}/${target.DB_NAME}`
);

const run = (command, { ignoreFailure = false } = {}) => {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, {
    cwd: backendDir,
    env,
    stdio: "inherit",
    shell: true
  });
  const code = result.status === null ? 1 : result.status;
  if (code !== 0 && !ignoreFailure) {
    console.error(`\nFalló: ${command} (exit ${code})`);
    process.exit(code);
  }
  return code;
};

const resetSchema = async () => {
  console.log(`\n> recreando ${target.DB_NAME} (drop + create)`);
  const connection = await mysql.createConnection({
    host: target.DB_HOST,
    port: Number(target.DB_PORT),
    user: target.DB_USER,
    password: target.DB_PASS
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${target.DB_NAME}\``);
  await connection.query(
    `CREATE DATABASE \`${target.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
  );
  await connection.end();
};

const main = async () => {
  try {
    await resetSchema();
  } catch (error) {
    console.error(
      `\nERROR al recrear la base: ${error.code || ""} ${error.message}\n` +
        "¿Está levantada? Corré: bash scripts/test-db.sh up"
    );
    process.exit(1);
  }

  // Las migraciones que corre el CLI son las compiladas: `.sequelizerc` apunta a
  // dist/. Si no hay dist (clon nuevo, por ejemplo) lo compilamos una vez para que
  // el error no sea un críptico "no migrations found".
  if (!fs.existsSync(path.join(backendDir, "dist", "database", "migrations"))) {
    console.log("dist/ no está compilado; compilando antes de migrar...");
    run(q(bin("tsc")));
  }

  run(`${q(bin("sequelize"))} db:migrate`);
  run(`${q(bin("sequelize"))} db:seed:all`);

  const jestExit = run(`${q(bin("jest"))} --runInBand`, { ignoreFailure: true });

  if (jestExit === 0) {
    console.log(
      "\nListo: la base de test queda migrada y seedeada (se recrea en la próxima corrida)."
    );
  }

  process.exit(jestExit);
};

main();
