/**
 * Teto de um arquivo enviado ao Safa Muda, em bytes.
 *
 * Mora sozinho aqui porque os dois lados precisam do mesmo número e não podem
 * se importar: `lib/storage.ts` carrega o SDK da AWS (servidor) e
 * `lib/comprimir-imagem.ts` mexe em canvas (navegador).
 *
 * 1 MB basta para a maior foto que a interface mostra, e o navegador reduz o
 * que passa disso antes de enviar — nenhuma foto é recusada por tamanho.
 */
export const LIMITE_DE_UPLOAD_BYTES = 1024 * 1024;
