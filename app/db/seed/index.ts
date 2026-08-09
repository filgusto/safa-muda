/**
 * Seed do banco.
 *
 *   npm run db:seed                    semeia o catálogo
 *   npm run db:seed -- admin@ex.com    semeia e promove o usuário a admin
 *   npm run db:seed -- --admin         semeia e promove o primeiro cadastrado
 */
import { eq, asc } from "drizzle-orm";
import { db } from "../index.ts";
import { user } from "../schema/index.ts";
import { semearEspecies } from "./especies.ts";

/**
 * Promove um usuário a admin.
 *
 * Deliberadamente não cria usuário com senha padrão: uma credencial conhecida
 * num projeto open-source vira porta aberta em toda instância que subir sem ler
 * a documentação.
 */
async function promoverAdmin(email?: string) {
  const alvo = email
    ? await db.query.user.findFirst({ where: eq(user.email, email) })
    : await db.query.user.findFirst({ orderBy: asc(user.createdAt) });

  if (!alvo) {
    console.error(
      email
        ? `Nenhum usuário com o e-mail ${email}.`
        : "Nenhum usuário cadastrado. Crie sua conta em /cadastro e rode de novo.",
    );
    return;
  }

  if (alvo.role === "admin") {
    console.log(`${alvo.email} já é admin.`);
    return;
  }

  await db.update(user).set({ role: "admin" }).where(eq(user.id, alvo.id));
  console.log(`${alvo.email} promovido a admin.`);
}

// Envolvido porque o tsx transpila como CJS — ver comentário em db/migrate.ts.
async function main() {
  const total = await semearEspecies();
  console.log(`Catálogo semeado: ${total} espécies.`);

  const argumento = process.argv[2];
  if (argumento) {
    await promoverAdmin(argumento === "--admin" ? undefined : argumento);
  }

  process.exit(0);
}

void main();
