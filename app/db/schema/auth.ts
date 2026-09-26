import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

/**
 * Tabelas exigidas pelo Better Auth, mais o campo `role` do Safa Muda.
 *
 * Os nomes de coluna seguem o que o adapter do Better Auth espera — não
 * renomeie sem ajustar a configuração em lib/auth.ts.
 */

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);

export const perfilDeUsoEnum = pgEnum("user_perfil_de_uso", [
  "agricultor",
  "em_formacao",
  "pesquisador",
  "tecnico",
  "curioso",
  "outro",
]);

export const experienciaEnum = pgEnum("user_experiencia", [
  "menos_de_1_ano",
  "de_1_a_3_anos",
  "de_3_a_10_anos",
  "mais_de_10_anos",
]);

/**
 * Como a pessoa quer ser tratada nas palavras que se flexionam em gênero.
 * Quando definido, vale em todo o site, inclusive nas telas públicas.
 */
export const tratamentoEnum = pgEnum("user_tratamento", [
  "feminino",
  "masculino",
  "neutro",
]);

/** Como o nome aparece nas contribuições públicas. */
export const creditoDeNomeEnum = pgEnum("user_credito_de_nome", [
  "completo",
  "primeiro_nome",
  "anonimo",
  "outro",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /**
   * user      — propõe edições no catálogo, cria projetos
   * moderator — avalia propostas na fila de moderação
   * admin     — tudo, mais gestão de usuários e arquivos
   */
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  /*
   * Perfil opcional (lib/perfil-de-usuario.ts). Nulo é "não informado" — nada
   * aqui é obrigatório nem preenchido por estimativa. Nenhum destes campos é
   * exibido publicamente hoje; a única exceção é o nome, conforme
   * `creditoNome`.
   */
  /** "Cidade, UF" da lista do IBGE (lib/ibge.ts). Nunca coordenada: privacidade. */
  regiao: text("regiao"),
  perfilDeUso: perfilDeUsoEnum("perfil_de_uso"),
  /** Texto livre de quem escolheu "outro" em `perfilDeUso`; nulo nos demais. */
  perfilDeUsoOutro: text("perfil_de_uso_outro"),
  experiencia: experienciaEnum("experiencia"),
  /** Sem chave de "tornar público": definir já é dizer como quer ser chamado. Nulo = masculino. */
  tratamento: tratamentoEnum("tratamento"),
  bio: text("bio"),
  linkInstagram: text("link_instagram"),
  linkSite: text("link_site"),
  linkLattes: text("link_lattes"),

  /** Como o nome aparece no histórico das espécies. */
  creditoNome: creditoDeNomeEnum("credito_nome").notNull().default("completo"),
  /** Como a pessoa pediu para ser citada, quando `creditoNome` é "outro". */
  creditoNomeOutro: text("credito_nome_outro"),
  /**
   * Quais links do perfil acompanham a citação. Todos começam desligados: um
   * link só é exibido ao lado do nome se a pessoa ligar a chave.
   */
  /**
   * "Tornar público": cada campo do perfil opcional só é compartilhado com a
   * comunidade se a pessoa ligar a chave dele. Tudo começa desligado.
   */
  publicoFoto: boolean("publico_foto").notNull().default(false),
  publicoRegiao: boolean("publico_regiao").notNull().default(false),
  publicoPerfilDeUso: boolean("publico_perfil_de_uso").notNull().default(false),
  publicoExperiencia: boolean("publico_experiencia").notNull().default(false),
  publicoBio: boolean("publico_bio").notNull().default(false),
  publicoInstagram: boolean("publico_instagram").notNull().default(false),
  publicoSite: boolean("publico_site").notNull().default(false),
  publicoLattes: boolean("publico_lattes").notNull().default(false),
  citarInstagram: boolean("citar_instagram").notNull().default(false),
  citarSite: boolean("citar_site").notNull().default(false),
  citarLattes: boolean("citar_lattes").notNull().default(false),
  /** Avisos por e-mail sobre a avaliação das contribuições da pessoa. */
  avisoPorEmail: boolean("aviso_por_email").notNull().default(true),

  /**
   * Consentimento: versão dos Termos e da Política (lib/termos.ts) aceita e
   * quando. Nulo em contas anteriores a esse registro — elas veem o pedido de
   * aceite em /conta.
   */
  termosVersao: text("termos_versao"),
  termosAceitosEm: timestamp("termos_aceitos_em"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
