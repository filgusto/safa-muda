// Preparação do bucket no Garage (roda a cada `up`, depois sai).
//
// O servidor sobe com `garage server --single-node` (ver os compose), que já
// monta o layout de um nó só. O resto é feito aqui, pela API de administração
// v2 (porta 3903, só dentro da rede do Docker):
//
//   1. Bucket privado `GARAGE_BUCKET`, se ainda não existir.
//   2. Chave da aplicação, importada de `GARAGE_APP_KEY_ID` /
//      `GARAGE_APP_SECRET_KEY` — as mesmas que o `web` recebe como
//      S3_ACCESS_KEY / S3_SECRET_KEY. Gere com o formato do Garage:
//      `GK` + `openssl rand -hex 12` e `openssl rand -hex 32`.
//   3. Mínimo privilégio: a chave lê, grava e remove objetos, mas não é dona
//      do bucket (não muda CORS, website nem apaga o bucket). Por isso não se
//      usa `--default-access-key` do servidor: ele devolve a posse à chave a
//      cada reinício.
//   4. CORS: o navegador envia as fotos direto ao Garage por POST pré-assinado
//      (ver app/lib/storage.ts), a partir da origem da aplicação. O MinIO
//      aceitava qualquer origem; aqui a regra fica restrita a `APP_ORIGIN`.
//
// Idempotente. A imagem do Garage não tem shell, por isso este passo roda num
// contêiner Node à parte, sem dependências.

const ADMIN = process.env.GARAGE_ADMIN_URL ?? "http://garage:3903";
const TOKEN = obrigatoria("GARAGE_ADMIN_TOKEN");
const BUCKET = obrigatoria("GARAGE_BUCKET");
const CHAVE = obrigatoria("GARAGE_APP_KEY_ID");
const SEGREDO = obrigatoria("GARAGE_APP_SECRET_KEY");
const ORIGEM = new URL(obrigatoria("APP_ORIGIN")).origin;

function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    console.error(`garage-init: defina ${nome}.`);
    process.exit(1);
  }
  return valor;
}

async function admin(endpoint, { query, body } = {}) {
  const url = new URL(`/v2/${endpoint}`, ADMIN);
  for (const [nome, valor] of Object.entries(query ?? {})) {
    url.searchParams.set(nome, valor);
  }
  const resposta = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!resposta.ok) {
    throw new Error(
      `${endpoint}: HTTP ${resposta.status} — ${await resposta.text()}`,
    );
  }
  return resposta.json();
}

async function tentar(endpoint, opcoes) {
  try {
    return await admin(endpoint, opcoes);
  } catch {
    return null;
  }
}

// O servidor aceita conexões antes de terminar de montar o layout; até lá,
// /health responde 503.
for (let tentativa = 1; ; tentativa++) {
  const saude = await fetch(new URL("/health", ADMIN)).catch(() => null);
  if (saude?.ok) break;
  if (tentativa === 30) throw new Error("Garage não ficou saudável em 60 s.");
  await new Promise((resolver) => setTimeout(resolver, 2000));
}

const bucket =
  (await tentar("GetBucketInfo", { query: { globalAlias: BUCKET } })) ??
  (await admin("CreateBucket", { body: { globalAlias: BUCKET } }));

const chave = await tentar("GetKeyInfo", {
  query: { id: CHAVE, showSecretKey: "true" },
});
if (!chave) {
  await admin("ImportKey", {
    body: {
      accessKeyId: CHAVE,
      secretAccessKey: SEGREDO,
      name: "safa-muda-app",
    },
  });
} else if (chave.secretAccessKey !== SEGREDO) {
  throw new Error(
    `A chave ${CHAVE} já existe no Garage com outro segredo. Volte ao ` +
      "segredo antigo ou remova a chave (garage key delete) antes de trocar.",
  );
}

await admin("UpdateBucket", {
  query: { id: bucket.id },
  body: {
    corsRules: [
      {
        AllowedOrigin: [ORIGEM],
        AllowedMethod: ["POST"],
        AllowedHeader: ["*"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
});

await admin("AllowBucketKey", {
  body: {
    bucketId: bucket.id,
    accessKeyId: CHAVE,
    permissions: { read: true, write: true },
  },
});

console.log(
  `garage-init: bucket ${BUCKET} pronto — privado, CORS para ${ORIGEM}, ` +
    `chave ${CHAVE} com leitura e escrita (sem posse do bucket).`,
);
