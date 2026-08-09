/**
 * Aplica as migrations pendentes. Roda no serviço `migrate` do compose de
 * produção e sob demanda em dev (`npm run db:migrate`).
 *
 * A extensão PostGIS é criada antes das migrations porque o schema espacial
 * (fase 4) depende dela e `CREATE EXTENSION` exige privilégio de superusuário,
 * que o drizzle-kit não assume.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Envolvido numa função porque o package.json não declara "type": "module",
// então o tsx transpila este arquivo como CJS, onde top-level await não existe.
async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL não definida.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
    console.log("Extensão postgis pronta.");

    await migrate(drizzle(sql), { migrationsFolder: "./db/migrations" });
    console.log("Migrations aplicadas.");
  } catch (error) {
    console.error("Falha ao aplicar migrations:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
