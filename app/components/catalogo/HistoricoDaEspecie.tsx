"use client";

import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Diff } from "@/components/wiki/Diff.tsx";
import { Secao } from "@/components/catalogo/Secao.tsx";
import { useSessaoHidratada } from "@/lib/auth-client.ts";
import { listarHistorico, type Revisao } from "@/app/actions/wiki.ts";

/**
 * Histórico de alterações da ficha — só para a equipe, e recolhido por padrão.
 *
 * É registro de procedência, útil a quem modera; para quem consulta o
 * catálogo seria ruído entre os dados da planta. Por isso fica escondido de
 * quem não modera e, mesmo para a equipe, não abre sozinho.
 *
 * As revisões chegam na primeira expansão, por ação de servidor que exige
 * moderador (ver `listarHistorico`): a ficha é ISR e não poderia decidir isso
 * no servidor, e mandá-las nas props deixaria o histórico legível no
 * código-fonte de qualquer visitante.
 */
export function HistoricoDaEspecie({ speciesId }: { speciesId: string }) {
  const { data: sessao } = useSessaoHidratada();
  const papel = sessao?.user.role;
  const [aberto, setAberto] = useState(false);
  const [revisoes, setRevisoes] = useState<Revisao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (papel !== "admin" && papel !== "moderator") return null;

  async function alternar(evento: React.MouseEvent) {
    // `<details>` controlado: sem isto, o navegador alternaria por conta e o
    // estado de React divergiria do que está na tela.
    evento.preventDefault();
    const abrindo = !aberto;
    setAberto(abrindo);

    // Carrega uma vez só, na primeira abertura.
    if (!abrindo || revisoes || carregando) return;
    setCarregando(true);
    const resultado = await listarHistorico(speciesId);
    setCarregando(false);

    if (resultado.ok) setRevisoes(resultado.revisoes);
    else setErro(resultado.erro);
  }

  return (
    <Secao
      titulo="Histórico"
      info={
        <>
          As alterações aprovadas nesta ficha, da mais recente para a mais
          antiga: o que mudou, quando, quem sugeriu e a fonte declarada. Visível
          só para a equipe.
        </>
      }
    >
      <details open={aberto}>
        <summary
          onClick={alternar}
          className="inline-flex cursor-pointer list-none items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
        >
          <ChevronRight
            size={13}
            className={`transition-transform duration-240 ${aberto ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          {aberto ? "Ocultar alterações" : "Ver alterações aprovadas"}
          {carregando && <Loader2 size={12} className="animate-spin" />}
        </summary>

        <div className="mt-3">
          {erro && (
            <p
              role="alert"
              className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
            >
              {erro}
            </p>
          )}

          {revisoes?.length === 0 && (
            <p className="text-sm italic text-muted-foreground">
              Nenhuma alteração aprovada nesta ficha.
            </p>
          )}

          {revisoes && revisoes.length > 0 && (
            <ul className="space-y-3">
              {revisoes.map((revisao) => (
                <li
                  key={revisao.id}
                  className="rounded-xl border border-bg-border bg-bg-surface1 p-4"
                >
                  <p className="mb-2 font-mono text-xs text-muted-foreground">
                    {new Date(revisao.criadoEm).toLocaleDateString("pt-BR")} ·{" "}
                    {revisao.autorNome ?? "autor removido"}
                  </p>
                  <Diff patch={revisao.patch} />
                  <p className="mt-2 text-xs leading-[1.6] text-muted-foreground/80">
                    Fonte: {revisao.fonte}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </Secao>
  );
}
