import { Secao } from "@/components/catalogo/Secao.tsx";
import { HistoricoDaEspecie } from "@/components/catalogo/HistoricoDaEspecie.tsx";
import {
  BotaoDeEdicao,
  ForaDoModoDeEdicao,
  SoNoModoDeEdicao,
} from "@/components/wiki/ModoDeEdicao.tsx";
import {
  CampoEditavel,
  NomeEditavel,
} from "@/components/wiki/CampoEditavel.tsx";
import { ObservacoesEditaveis } from "@/components/wiki/ObservacoesEditaveis.tsx";
import {
  PastilhaGrupo,
  rotuloSucessao,
  rotuloSistema,
} from "@/components/catalogo/CardEspecie.tsx";
import { GRUPO_LABEL, FONTE_LABEL, type Grupo } from "@/core/grupos.ts";
import {
  luzQueChegaAo,
  ESTRATO_LABEL,
  OCUPACAO_IDEAL,
} from "@/core/estratos.ts";
import {
  CICLO_DE_VIDA_LABEL,
  FRUTIFICACAO_LABEL,
  HABITO_LABEL,
  formatarLongevidade,
  inconsistenciasDoCiclo,
} from "@/core/ciclo.ts";
import {
  REBROTA_LABEL,
  GEMA_DE_REBROTA_LABEL,
  PODA_DRASTICA_LABEL,
  COMO_ELIMINAR_LABEL,
  RESSALVA_DA_PODA,
  podaDrasticaTolerada,
  comoEliminar,
  inconsistenciasDaPoda,
} from "@/core/poda.ts";
import type { Species } from "@/db/schema/species.ts";
import type { FotoDaEspecie } from "@/lib/catalogo.ts";
import { CarrosselDeFotos } from "@/components/catalogo/CarrosselDeFotos.tsx";
import {
  BotaoAdicionarFoto,
  FotosPendentes,
} from "@/components/catalogo/AdicionarFoto.tsx";
import { LinksExternos } from "@/components/catalogo/LinksExternos.tsx";
/**
 * Nome comum + tags de grupo + nome científico (com os links externos ao
 * lado) + sinônimos — a identidade da espécie, sem os botões de ação.
 * Reaproveitado pela faixa fixa do modal (ver ModalDaEspecie.tsx) e pelo
 * cabeçalho da página própria abaixo.
 */
export function IdentidadeDaEspecie({ especie }: { especie: Species }) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <NomeEditavel
          chave="nomeComum"
          atual={especie.nomeComum}
          slug={especie.slug}
        >
          <h1 className="font-serif text-display-md font-semibold tracking-tight">
            {especie.nomeComum}
          </h1>
        </NomeEditavel>
        {especie.grupos.map((grupo) => (
          <PastilhaGrupo key={grupo} grupo={grupo as Grupo} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NomeEditavel
          chave="nomeCientifico"
          atual={especie.nomeCientifico}
          slug={especie.slug}
        >
          <p className="font-mono italic text-secondary">
            {especie.nomeCientifico}
          </p>
        </NomeEditavel>
        <ForaDoModoDeEdicao>
          <LinksExternos
            gbifId={especie.gbifId}
            inaturalistId={especie.inaturalistId}
          />
        </ForaDoModoDeEdicao>
      </div>
      {especie.sinonimos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Também chamada de {especie.sinonimos.join(", ")}.
        </p>
      )}
    </div>
  );
}

/**
 * Ficha da espécie, sem moldura.
 *
 * Serve tanto à página própria (`/safdex/[slug]`) quanto ao modal que a
 * intercepta a partir da grade — o conteúdo é o mesmo, só muda o entorno.
 * Precisa estar dentro de `ProvedorDoModoDeEdicao`, que fica no entorno: no
 * modal, o botão de edição vai na moldura, ao lado do X, e só na página
 * própria ele entra no cabeçalho (`comBotaoDeEdicao`).
 */
export function DetalheEspecie({
  especie,
  fotos,
  comBotaoDeEdicao = false,
  comCabecalho = true,
}: {
  especie: Species;
  fotos: FotoDaEspecie[];
  comBotaoDeEdicao?: boolean;
  /** `false` no modal: a identidade já aparece na faixa fixa da moldura. */
  comCabecalho?: boolean;
}) {
  return (
    <>
      {comCabecalho && (
        <header className="mb-10 flex items-start gap-4">
          <IdentidadeDaEspecie especie={especie} />
          {comBotaoDeEdicao && (
            <div className="mt-3 flex items-center gap-1">
              <BotaoDeEdicao />
            </div>
          )}
        </header>
      )}

      <Secao
        titulo="Fotos"
        info={
          <>
            A planta em cada fase: semente, jovem, adulta, flor, fruta e raiz.
            Toda foto traz o crédito de quem fotografou ou de onde veio. As
            enviadas pela comunidade passam pela equipe do Safa Muda antes de
            aparecer aqui.
          </>
        }
        acao={<BotaoAdicionarFoto nomeDaEspecie={especie.nomeComum} />}
      >
        <CarrosselDeFotos fotos={fotos} />
        <FotosPendentes />
      </Secao>

      <Secao
        titulo="Classificação agroflorestal"
        info={
          <>
            Onde a espécie entra no consórcio. <strong>Estrato</strong>: o andar
            que a copa ocupa, do emergente ao rasteiro.{" "}
            <strong>Sucessão</strong>: o momento em que ela cumpre seu papel, da
            placenta ao clímax — não é a altura que define o papel, e sim o
            momento e a função. <strong>Sistema</strong>: o degrau de
            fertilidade do solo em que ela vive, da retomada à abundância.
            Referência: <em>Agroflorestando o Mundo</em>, cap. 7.
          </>
        }
      >
        <CampoEditavel
          {...editavel(especie, "estrato")}
          rotulo="Estrato"
          valor={especie.estrato ? ESTRATO_LABEL[especie.estrato] : null}
        />
        <CampoEditavel
          {...editavel(especie, "sucessao")}
          rotulo="Sucessão"
          valor={rotuloSucessao(especie.sucessao)}
        />
        <CampoEditavel
          {...editavel(especie, "sistema")}
          rotulo="Sistema"
          valor={rotuloSistema(especie.sistema)}
        />
        <CampoEditavel
          {...editavel(especie, "familia")}
          rotulo="Família"
          valor={especie.familia}
        />
        <CampoEditavel
          {...editavel(especie, "grupos")}
          rotulo="Grupos"
          valor={
            especie.grupos.length
              ? especie.grupos
                  .map((grupo) => GRUPO_LABEL[grupo as Grupo] ?? grupo)
                  .join(", ")
              : null
          }
        />
      </Secao>

      {especie.estrato && especie.estrato !== "rasteiro" && (
        <Secao
          titulo="Luz e ocupação"
          info={
            <>
              Valores do estrato, não da espécie. Vêm das estimativas de Ernst
              Götsch registradas em <em>Agroflorestando o Mundo</em> (cap. 7.3)
              e das tabelas de consórcio do cap. 10.
            </>
          }
        >
          {/* Valores do estrato (core/): sem editor próprio. */}
          <CampoEditavel
            slug={especie.slug}
            rotulo="Luz que chega"
            valor={`${Math.round(luzQueChegaAo(especie.estrato) * 100)}% da luz plena, com os andares acima ocupados`}
          />
          <CampoEditavel
            slug={especie.slug}
            rotulo="Ocupação ideal"
            valor={
              OCUPACAO_IDEAL[especie.estrato] !== null
                ? `${Math.round(OCUPACAO_IDEAL[especie.estrato]! * 100)}% do andar`
                : null
            }
          />
        </Secao>
      )}

      <Secao
        titulo="Ciclo de vida e porte"
        info={
          <>
            Como a planta vive: o ciclo biológico (anual, bienal, perene) — não
            o de cultivo —, se frutifica uma vez só e morre (monocárpica), a
            forma de vida, quanto vive depois de adulta, a altura que alcança e
            quando começa a produzir. Um aviso em amarelo aparece quando os
            valores informados se contradizem.
          </>
        }
      >
        <CampoEditavel
          {...editavel(especie, "cicloDeVida")}
          rotulo="Ciclo de vida"
          valor={lista(especie.cicloDeVida.map((c) => CICLO_DE_VIDA_LABEL[c]))}
        />
        <CampoEditavel
          {...editavel(especie, "frutificacao")}
          rotulo="Frutificação"
          valor={
            especie.frutificacao
              ? FRUTIFICACAO_LABEL[especie.frutificacao]
              : null
          }
        />
        <CampoEditavel
          {...editavel(especie, "habito")}
          rotulo="Hábito"
          valor={lista(especie.habito.map((h) => HABITO_LABEL[h]))}
        />
        <CampoEditavel
          {...editavel(especie, "longevidadeMinAnos", "longevidadeMaxAnos")}
          rotulo="Longevidade"
          valor={formatarLongevidade(
            especie.longevidadeMinAnos,
            especie.longevidadeMaxAnos,
          )}
        />
        <CampoEditavel
          {...editavel(especie, "alturaMaduraM")}
          rotulo="Altura madura"
          valor={
            especie.alturaMaduraM !== null
              ? `${formatar(especie.alturaMaduraM)} m`
              : null
          }
        />
        <CampoEditavel
          {...editavel(especie, "produtivaAPartirDeMeses")}
          rotulo="Produz a partir de"
          valor={
            especie.produtivaAPartirDeMeses !== null
              ? `${especie.produtivaAPartirDeMeses} meses`
              : null
          }
        />
        {inconsistenciasDoCiclo(especie).map((aviso) => (
          <p
            key={aviso}
            className="mt-3 text-sm leading-[1.6] text-amber-700 dark:text-amber-300"
          >
            {aviso} Vale conferir a fonte.
          </p>
        ))}
      </Secao>

      <SecaoDePoda especie={especie} />

      {temDadosDeCultivo(especie) && (
        <Secao
          titulo="Ciclo e espaçamento"
          info={
            <>
              Dias até a colheita e espaçamento entre linhas e na linha, como
              referência de partida. Vêm de cultivo em monocultura (
              <em>Agroflorestando o Mundo</em>, cap. 10); no consórcio,
              ajustam-se ao solo, ao clima e à estação.
            </>
          }
        >
          <p className="mb-4 max-w-[60ch] text-sm leading-[1.7] text-muted-foreground">
            Referência de partida em monocultura. O próprio livro adverte que
            espaçamentos e ciclos mudam com solo, clima e estação.
          </p>
          <Campo
            rotulo="Dias para colher"
            valor={faixa(
              especie.diasParaColherMin,
              especie.diasParaColherMax,
              "dias",
            )}
          />
          <Campo
            rotulo="Entre linhas"
            valor={faixa(
              especie.espacamentoEntreLinhasMinM,
              especie.espacamentoEntreLinhasMaxM,
              "m",
            )}
          />
          <Campo
            rotulo="Na linha"
            valor={faixa(
              especie.espacamentoNaLinhaMinM,
              especie.espacamentoNaLinhaMaxM,
              "m",
            )}
          />
        </Secao>
      )}

      <ObservacoesEditaveis slug={especie.slug} notas={especie.notas} />

      <SoNoModoDeEdicao>
        <Secao
          titulo="Links externos"
          info={
            <>
              A mesma espécie no GBIF, a base global de dados de biodiversidade,
              e no iNaturalist, de observações de campo. Cole a URL da página da
              espécie ou só o número do ID — conferimos se o link existe antes
              de aceitar.
            </>
          }
        >
          <CampoEditavel
            {...editavel(especie, "gbifId")}
            rotulo="GBIF"
            valor={especie.gbifId ? `gbif.org/species/${especie.gbifId}` : null}
          />
          <CampoEditavel
            {...editavel(especie, "inaturalistId")}
            rotulo="iNaturalist"
            valor={
              especie.inaturalistId
                ? `inaturalist.org/taxa/${especie.inaturalistId}`
                : null
            }
          />
        </Secao>
      </SoNoModoDeEdicao>

      <Secao
        titulo="Fontes"
        info={
          <>
            De onde vêm os valores desta ficha. Nenhum campo é preenchido por
            estimativa: quando a fonte não informa, ele fica como &ldquo;não
            informado&rdquo;. &ldquo;Contribuição da comunidade&rdquo; marca os
            campos corrigidos por sugestões aprovadas pela equipe.
          </>
        }
      >
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {[...new Set(Object.values(especie.fontes))].map((fonte) => (
            <li key={fonte}>{FONTE_LABEL[fonte] ?? fonte}</li>
          ))}
        </ul>
      </Secao>

      <HistoricoDaEspecie speciesId={especie.id} />
    </>
  );
}

/**
 * Poda: os dados informados e o que eles implicam no manejo — até onde a poda
 * pode ir e de onde para baixo o corte elimina. A orientação só aparece quando
 * deriva de dado com fonte, e sempre com a ressalva.
 */
function SecaoDePoda({ especie }: { especie: Species }) {
  const drastica = podaDrasticaTolerada(especie);
  const eliminar = comoEliminar(especie);

  return (
    <Secao
      titulo="Poda"
      info={
        <>
          Se a planta rebrota depois de um corte drástico e de onde ficam as
          gemas que rebrotam (Bond &amp; Midgley 2001; Clarke et al. 2013).
          &ldquo;Poda drástica&rdquo; e &ldquo;para eliminar&rdquo; são
          deduzidas desses dois dados e só aparecem quando eles foram
          informados. É referência, não garantia.
        </>
      }
    >
      <CampoEditavel
        {...editavel(especie, "rebrota")}
        rotulo="Rebrota"
        valor={especie.rebrota ? REBROTA_LABEL[especie.rebrota] : null}
      />
      <CampoEditavel
        {...editavel(especie, "gemasDeRebrota")}
        rotulo="Rebrota de onde"
        valor={lista(
          especie.gemasDeRebrota.map((gema) => GEMA_DE_REBROTA_LABEL[gema]),
        )}
      />
      {/* Deduzidos de rebrota + gemas (core/poda.ts): sem editor próprio. */}
      <CampoEditavel
        slug={especie.slug}
        rotulo="Poda drástica"
        valor={drastica ? PODA_DRASTICA_LABEL[drastica] : null}
      />
      <CampoEditavel
        slug={especie.slug}
        rotulo="Para eliminar"
        valor={eliminar ? COMO_ELIMINAR_LABEL[eliminar] : null}
      />
      {inconsistenciasDaPoda(especie).map((aviso) => (
        <p
          key={aviso}
          className="mt-3 text-sm leading-[1.6] text-amber-700 dark:text-amber-300"
        >
          {aviso} Vale conferir a fonte.
        </p>
      ))}
      {(drastica || eliminar) && (
        <p className="mt-3 max-w-[60ch] text-sm leading-[1.7] text-muted-foreground">
          {RESSALVA_DA_PODA}
        </p>
      )}
    </Secao>
  );
}

/**
 * Props de um campo editável: a chave (ou o par mín./máx.) e o valor gravado
 * de cada uma, de onde o editor parte. Só o necessário cruza para o cliente.
 */
function editavel(especie: Species, ...chaves: (keyof Species)[]) {
  return {
    slug: especie.slug,
    chaves: chaves as string[],
    atuais: Object.fromEntries(chaves.map((chave) => [chave, especie[chave]])),
  };
}

function temDadosDeCultivo(especie: Species): boolean {
  return (
    especie.diasParaColherMin !== null ||
    especie.espacamentoEntreLinhasMinM !== null ||
    especie.espacamentoNaLinhaMinM !== null
  );
}

function lista(valores: string[]): string | null {
  return valores.length ? valores.join(", ") : null;
}

function faixa(
  min: number | null,
  max: number | null,
  unidade: string,
): string | null {
  if (min === null) return null;
  if (max === null || min === max) return `${formatar(min)} ${unidade}`;
  return `${formatar(min)} a ${formatar(max)} ${unidade}`;
}

function formatar(valor: number): string {
  return Number.isInteger(valor)
    ? String(valor)
    : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/40 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      <span
        className={
          valor ? "text-foreground" : "text-sm italic text-muted-foreground/60"
        }
      >
        {valor ?? "não informado"}
      </span>
    </div>
  );
}
