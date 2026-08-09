import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

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

/** 15 MB — foto de celular cabe folgado, PDF de mapa não entra por engano. */
export const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024;

export function ehTipoPermitido(mimeType: string): boolean {
  return (TIPOS_PERMITIDOS as readonly string[]).includes(mimeType);
}

/**
 * Gera uma chave de objeto opaca. Não deriva do nome original: nomes de arquivo
 * de campo colidem muito ("IMG_0001.jpg") e podem carregar dado pessoal.
 */
export function gerarChave(filename: string): string {
  const extensao = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";
  const hoje = new Date().toISOString().slice(0, 7); // AAAA-MM
  return `${hoje}/${randomUUID()}${extensao}`;
}

/** URL pré-assinada para o navegador subir o arquivo. Vale 5 minutos. */
export async function urlDeUpload(params: {
  key: string;
  contentType: string;
}): Promise<string> {
  const comando = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3Publico, comando, { expiresIn: 300 });
}

export async function removerObjeto(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** URL pública de leitura, servida pelo próprio domínio da aplicação. */
export function urlPublica(key: string): string {
  return `/media/${key}`;
}
