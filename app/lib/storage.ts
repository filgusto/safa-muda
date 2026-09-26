import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";
import { LIMITE_DE_UPLOAD_BYTES } from "./limite-de-upload.ts";

/**
 * Acesso ao MinIO (S3-compatível).
 *
 * O upload é feito pelo navegador direto no MinIO, via URL pré-assinada — o
 * arquivo não passa pelo servidor Next. Isso evita segurar imagens de campo
 * (que são grandes e vêm de celular) na memória do processo.
 *
 * A leitura é pública via /media/<key>, reescrito para o bucket pelo Next
 * (ver next.config.mjs).
 */

export const BUCKET = process.env.S3_BUCKET ?? "safa-muda-media";

const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY ?? "",
  secretAccessKey: process.env.S3_SECRET_KEY ?? "",
};

/** Endpoint interno: o servidor fala com o MinIO pela rede do Docker. */
const endpointInterno = process.env.S3_ENDPOINT ?? "http://minio:9000";

/**
 * Endpoint público: o NAVEGADOR precisa alcançar o MinIO para o upload
 * pré-assinado, e `http://minio:9000` só existe dentro da rede do Docker.
 *
 * A assinatura SigV4 cobre o cabeçalho Host, então não dá para gerar a URL com
 * um endpoint e trocar o host depois — a assinatura quebra. Por isso são dois
 * clientes, cada um assinando para o host que vai de fato receber a requisição.
 */
const endpointPublico = process.env.S3_PUBLIC_ENDPOINT ?? endpointInterno;

/** Operações servidor→MinIO (remoção, cópia, leitura de metadados). */
export const s3 = new S3Client({
  endpoint: endpointInterno,
  region: "us-east-1",
  credentials,
  forcePathStyle: true, // MinIO usa URLs path-style
});

/** Usado só para assinar URLs que o navegador vai abrir. */
const s3Publico = new S3Client({
  endpoint: endpointPublico,
  region: "us-east-1",
  credentials,
  forcePathStyle: true,
});

export const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * 1 MB. O navegador reduz a imagem antes de enviar (ver
 * lib/comprimir-imagem.ts), então o teto não recusa foto de celular — só
 * impede que um envio fora desse caminho encha o disco.
 */
export const TAMANHO_MAXIMO_BYTES = LIMITE_DE_UPLOAD_BYTES;

export function ehTipoPermitido(mimeType: string): boolean {
  return (TIPOS_PERMITIDOS as readonly string[]).includes(mimeType);
}

const EXTENSAO_POR_TIPO: Record<(typeof TIPOS_PERMITIDOS)[number], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

/**
 * Gera uma chave de objeto opaca. Não deriva do nome original: nomes de arquivo
 * de campo colidem muito ("IMG_0001.jpg"), podem carregar dado pessoal e a
 * extensão vinda do cliente é livre ("x.svg", "x.html"). A extensão sai do tipo
 * já validado.
 */
export function gerarChave(contentType: string): string {
  const extensao =
    EXTENSAO_POR_TIPO[contentType as keyof typeof EXTENSAO_POR_TIPO];
  if (!extensao)
    throw new Error(`Tipo de arquivo não permitido: ${contentType}`);
  const hoje = new Date().toISOString().slice(0, 7); // AAAA-MM
  return `${hoje}/${randomUUID()}${extensao}`;
}

/**
 * POST pré-assinado para o navegador subir o arquivo. Vale 5 minutos.
 *
 * Diferente de um PUT pré-assinado, a política assinada fixa a chave, o tipo e
 * o tamanho: o MinIO recusa qualquer envio fora de `1 … TAMANHO_MAXIMO_BYTES`
 * ou com outro Content-Type, mesmo que o cliente declare um tamanho falso.
 */
export async function postDeUpload(params: {
  key: string;
  contentType: string;
}): Promise<{ url: string; fields: Record<string, string> }> {
  return createPresignedPost(s3Publico, {
    Bucket: BUCKET,
    Key: params.key,
    Conditions: [
      ["content-length-range", 1, TAMANHO_MAXIMO_BYTES],
      ["eq", "$Content-Type", params.contentType],
    ],
    Fields: { "Content-Type": params.contentType },
    Expires: 300,
  });
}

export async function removerObjeto(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** URL pública de leitura, servida pelo próprio domínio da aplicação. */
export function urlPublica(key: string): string {
  return `/media/${key}`;
}
