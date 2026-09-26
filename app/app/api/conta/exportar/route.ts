import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  changeProposal,
  media,
  notification,
  project,
  user,
} from "@/db/schema/index.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";

export const dynamic = "force-dynamic";

/**
 * Cópia dos dados da própria pessoa em JSON (LGPD art. 18, II e V: acesso e
 * portabilidade). Só entrega o que é da sessão de quem pede.
 */
export async function GET() {
  try {
    const viewer = await requireViewer();

    const [conta] = await db.select().from(user).where(eq(user.id, viewer.id));
    const [propostas, notificacoes, midias, projetos] = await Promise.all([
      db
        .select({
          id: changeProposal.id,
          tipo: changeProposal.tipo,
          patch: changeProposal.patch,
          fonte: changeProposal.fonte,
          justificativa: changeProposal.justificativa,
          status: changeProposal.status,
          notaDaRevisao: changeProposal.notaDaRevisao,
          criadoEm: changeProposal.criadoEm,
        })
        .from(changeProposal)
        .where(eq(changeProposal.autorId, viewer.id)),
      db
        .select({
          titulo: notification.titulo,
          corpo: notification.corpo,
          criadoEm: notification.criadoEm,
        })
        .from(notification)
        .where(eq(notification.userId, viewer.id)),
      db
        .select({
          arquivo: media.filename,
          tipo: media.mimeType,
          tamanhoEmBytes: media.size,
          url: media.key,
          enviadoEm: media.createdAt,
        })
        .from(media)
        .where(eq(media.uploadedBy, viewer.id)),
      db
        .select({
          nome: project.nome,
          descricao: project.descricao,
          dataInicio: project.dataInicio,
          criadoEm: project.criadoEm,
        })
        .from(project)
        .where(eq(project.ownerId, viewer.id)),
    ]);

    const corpo = {
      geradoEm: new Date().toISOString(),
      conta,
      propostas,
      notificacoes,
      midiasEnviadas: midias.map((m) => ({ ...m, url: `/media/${m.url}` })),
      projetos,
    };

    return new NextResponse(JSON.stringify(corpo, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="safa-muda-meus-dados.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    if (erro instanceof AccessError) {
      return NextResponse.json(
        { error: erro.message },
        { status: erro.status },
      );
    }
    console.error("Falha ao exportar os dados da conta:", erro);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
