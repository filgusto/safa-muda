# ADR 0003 — Garage no lugar do MinIO

**Data:** 2026-09-29
**Status:** aceito

## Contexto

O armazenamento de objetos (fotos do catálogo, do diário de campo e de perfil)
era o MinIO. A edição comunitária foi desmontada ao longo de um ano:

- meados de 2025: o console administrativo sai da edição comunitária;
- outubro de 2025: fim das imagens Docker e dos binários gratuitos;
- fevereiro de 2026: o repositório open source é arquivado;
- 11 de setembro de 2026: `minio/minio` e `minio/mc` são apagados do Docker
  Hub — todo `docker compose pull` sem cache passa a falhar.

A versão fixada em produção (`RELEASE.2025-09-07T16-13-09Z`) não receberia mais
correções de segurança. As imagens antigas ainda existem no Quay, mas apontar
para lá só adiaria o problema.

## Decisão

Trocar o MinIO pelo [Garage](https://garagehq.deuxfleurs.fr/) (`dxflrs/garage`),
em nó único, antes do primeiro deploy.

- `garage server --single-node` monta o layout do nó.
- `garage/init.mjs` (contêiner `garage-init`, roda e sai) cria o bucket privado,
  importa a chave da aplicação com leitura e escrita — sem posse do bucket — e
  grava a regra de CORS restrita à origem da aplicação.
- A aplicação não muda: continua falando S3 pelo `@aws-sdk/client-s3`, com
  path-style e região `us-east-1` (fixada em `garage/garage.toml`).

## Motivos

1. **Licença e governança.** AGPL, como o Safa Muda, mantido por uma associação
   (Deuxfleurs), não por uma empresa com um produto comercial a empurrar.
2. **Tamanho certo.** Um binário, pouca memória, pensado para auto-hospedagem
   modesta — o perfil deste projeto.
3. **Cobre o que usamos.** Conferido na prática, contra o código de
   `app/lib/storage.ts`:
   - POST pré-assinado **com a política aplicada**: envio acima de
     `TAMANHO_MAXIMO_BYTES` é recusado ("File size does not match policy"), e
     `Content-Type` diferente do assinado também;
   - `GetObject` devolve o `Content-Type` gravado no envio;
   - `HeadBucket` (usado por `/api/health?deep=1`) e `DeleteObject`;
   - CORS por bucket, recusando preflight de outra origem.

## Consequências

- **Sem console web.** A inspeção é pelo CLI:
  `docker compose exec garage /garage bucket info safa-muda-media`.
- **Sem bucket policy nem IAM.** O Garage usa permissão por chave e por bucket
  (leitura, escrita, dono). A política do MinIO (Put/Get/Delete no bucket)
  vira "leitura + escrita, sem dono".
- **CORS explícito.** O MinIO aceitava qualquer origem por padrão; o Garage não
  aceita nenhuma. A origem vem de `NEXT_PUBLIC_SERVER_URL` em produção — se o
  domínio mudar, o próximo `up` reaplica a regra.
- **Chave com formato próprio.** `GK` + 24 hex e segredo de 64 hex. O
  `garage-init` recusa trocar o segredo de uma chave já importada, em vez de
  sobrescrever em silêncio.
- **Backup com rclone.** `scripts/backup-db.sh` usa `rclone copy` no lugar do
  `mc mirror`.
- **Sem versionamento de objetos, object lock ou criptografia no servidor.**
  Nenhum era usado.
- **Migração dos dados de desenvolvimento.** Feita uma vez com `rclone copy`
  de S3 para S3 (preserva o `Content-Type`), conferida por hash, tamanho e
  `Content-Type` objeto a objeto. O volume antigo `safa-muda-minio-data` não é
  mais montado por nenhum serviço.
