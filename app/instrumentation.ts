import { problemasDoAmbiente } from "@/lib/ambiente.ts";

/**
 * Na partida do servidor em produção, recusa subir com configuração incompleta
 * — melhor um container que não fica saudável do que um site que perde e-mails
 * de confirmação ou envia fotos para um endereço que o navegador não alcança.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const problemas = problemasDoAmbiente(process.env);
  if (problemas.length > 0) {
    throw new Error(
      `Configuração de produção inválida:\n- ${problemas.join("\n- ")}`,
    );
  }
}
