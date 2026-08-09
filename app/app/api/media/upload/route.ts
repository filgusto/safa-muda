import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { media } from "@/db/schema/index.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";
import {
  ehTipoPermitido,
  gerarChave,
  urlDeUpload,
  urlPublica,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_PERMITIDOS,
} from "@/lib/storage.ts";

const corpoSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine(ehTipoPermitido, {
    message: `Tipo não permitido. Aceitos: ${TIPOS_PERMITIDOS.join(", ")}`,
  }),
  size: z.number().int().positive().max(TAMANHO_MAXIMO_BYTES),
  alt: z.string().max(500).optional(),
});

/**
 * Registra o arquivo e devolve uma URL pré-assinada para o navegador subir o
 * conteúdo direto no MinIO.
 *
 * A linha em `media` é criada antes do upload de fato. Se o navegador desistir,
 * fica um registro órfão sem objeto — barato, e detectável por uma varredura
 * futura. O inverso (objeto sem registro) seria pior: arquivo pago e invisível.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();

    const resultado = corpoSchema.safeParse(await request.json());
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const { filename, contentType, size, alt } = resultado.data;
    const key = gerarChave(filename);

    const [registro] = await db
      .insert(media)
      .values({
        key,
        filename,
        mimeType: contentType,
        size,
        alt,
        uploadedBy: viewer.id,
      })
      .returning();

    return NextResponse.json({
      mediaId: registro!.id,
      uploadUrl: await urlDeUpload({ key, contentType }),
      publicUrl: urlPublica(key),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Falha ao preparar upload:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
