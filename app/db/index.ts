import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * Cliente do banco.
 *
 * A inicialização é PREGUIÇOSA de propósito. `next build` roda com
 * NODE_ENV=production e importa este módulo ao coletar as páginas, antes de
 * qualquer segredo de runtime existir. Validar DATABASE_URL no topo do módulo
 * quebraria o build — foi exatamente a armadilha que o boilerplate original
 * documentava para o Payload.
 *
 * Com o proxy abaixo, a variável só é exigida na primeira consulta de verdade.
 */

type Db = ReturnType<typeof criarDb>;

/**
 * Só a CONEXÃO vai para o globalThis, nunca a instância do Drizzle.
 *
 * O que precisa sobreviver ao hot-reload é o pool: sem isso, cada edição
 * abriria um pool novo até esgotar as conexões do Postgres.
 *
 * A instância do Drizzle, ao contrário, precisa ser recriada — ela congela o
 * `schema` recebido, e guardá-la no globalThis fazia o `db.query` continuar
 * exposto ao schema antigo depois de acrescentar tabelas. O sintoma era
 * cruel: `db.query.project` indefinido só no servidor do Next, enquanto
 * qualquer script via tsx funcionava. Montar o wrapper é barato.
 */
const globalForDb = globalThis as unknown as {
  sqlClient?: ReturnType<typeof postgres>;
};

let instancia: Db | undefined;

function criarDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env e suba a stack com `docker compose up -d`.",
    );
  }

  const sqlClient =
    globalForDb.sqlClient ?? postgres(connectionString, { max: 10 });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.sqlClient = sqlClient;
  }

  return drizzle(sqlClient, { schema });
}

function obterDb(): Db {
  // Módulo-local: reinicia junto com o módulo a cada hot-reload, que é
  // exatamente o comportamento desejado.
  if (!instancia) instancia = criarDb();
  return instancia;
}

export const db = new Proxy({} as Db, {
  get: (_alvo, propriedade) => Reflect.get(obterDb(), propriedade),
});

export { schema };
