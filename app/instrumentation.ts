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

  agendarVarreduraDeUploads();
}

const UM_DIA_MS = 24 * 60 * 60_000;
const ESPERA_INICIAL_MS = 10 * 60_000;

/**
 * Varredura diária dos envios abandonados (lib/limpeza-de-midia.ts) e dos
 * contadores de limite de taxa vencidos (lib/limite-de-taxa.ts). Roda no
 * próprio processo porque a imagem de produção não leva scripts avulsos. Com
 * mais de uma instância as duas tarefas continuam corretas (só repetidas):
 * apagar o que já venceu é idempotente. O import é dinâmico para não tocar banco nem S3 na carga do módulo
 * (ADR 0002), e `unref` impede que o temporizador segure o encerramento.
 */
function agendarVarreduraDeUploads() {
  const varrer = async () => {
    // O `if` envolve o import de propósito: o Next compila este arquivo
    // também para o runtime edge, e só descarta o import (que puxa
    // node:crypto via lib/storage.ts) se ele estiver dentro desta condição.
    if (process.env.NEXT_RUNTIME === "nodejs") {
      try {
        const { varrerUploadsOrfaos } =
          await import("@/lib/limpeza-de-midia.ts");
        const total = await varrerUploadsOrfaos();
        if (total > 0) {
          console.info(`Varredura de envios abandonados: ${total} examinados.`);
        }
      } catch (erro) {
        console.error("Falha na varredura de envios abandonados:", erro);
      }
      try {
        const { limparLimitesVencidos } =
          await import("@/lib/limite-de-taxa.ts");
        await limparLimitesVencidos();
      } catch (erro) {
        console.error("Falha ao limpar os limites de taxa vencidos:", erro);
      }
    }
  };

  setTimeout(() => {
    void varrer();
    setInterval(() => void varrer(), UM_DIA_MS).unref();
  }, ESPERA_INICIAL_MS).unref();
}
