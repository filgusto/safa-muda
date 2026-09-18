import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { user } from "@/db/schema/index.ts";
import {
  botaoDoEmail,
  enviarEmail,
  escaparHtml,
  moldeDeEmail,
  paragrafoDoEmail,
} from "@/lib/email.ts";

/**
 * E-mail a quem contribuiu, quando a equipe avalia o que foi enviado.
 *
 * O modo de edição promete esse aviso ao enviar ("você receberá uma
 * confirmação… em seu e-mail cadastrado"); sem ele, a notificação interna só
 * seria vista por quem voltasse ao site.
 *
 * Nunca lança: a avaliação já foi gravada quando isto roda, e uma falha de
 * SMTP não deve desfazê-la nem aparecer como erro para a moderação.
 */
export async function avisarAvaliacao({
  autorId,
  aprovada,
  oQue,
  nomeDaEspecie,
  slug,
  nota,
}: {
  autorId: string;
  aprovada: boolean;
  /** "Sua sugestão de alteração", "Sua foto" — sujeito da frase. */
  oQue: string;
  nomeDaEspecie: string;
  slug: string;
  nota?: string | null;
}): Promise<void> {
  try {
    const autor = await db.query.user.findFirst({
      where: eq(user.id, autorId),
    });
    if (!autor) return;

    const endereco = `${process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000"}/safdex/${slug}`;
    const resultado = aprovada
      ? `foi aprovada e já está na ficha de ${nomeDaEspecie}.`
      : `não foi incorporada à ficha de ${nomeDaEspecie}.`;
    const rotuloDaNota = aprovada ? "Nota da equipe" : "Motivo";

    await enviarEmail({
      para: autor.email,
      assunto: `${aprovada ? "Aprovada" : "Não aprovada"}: ${nomeDaEspecie} · Safa Muda`,
      texto: [
        `Olá, ${autor.name}.`,
        "",
        `${oQue} para ${nomeDaEspecie} ${resultado}`,
        ...(nota ? ["", `${rotuloDaNota}: ${nota}`] : []),
        "",
        `Ver a ficha: ${endereco}`,
        "",
        "Obrigado por contribuir com o Safa Muda.",
      ].join("\n"),
      html: moldeDeEmail(
        [
          paragrafoDoEmail(`Olá, ${escaparHtml(autor.name)}.`),
          paragrafoDoEmail(
            `${escaparHtml(oQue)} para <strong>${escaparHtml(nomeDaEspecie)}</strong> ${escaparHtml(resultado)}`,
          ),
          nota
            ? paragrafoDoEmail(
                `<strong>${rotuloDaNota}:</strong> ${escaparHtml(nota)}`,
              )
            : "",
          botaoDoEmail(endereco, "Ver a ficha"),
          paragrafoDoEmail("Obrigado por contribuir com o Safa Muda."),
        ].join(""),
      ),
    });
  } catch (erro) {
    console.error("Falha ao avisar a avaliação por e-mail:", erro);
  }
}
