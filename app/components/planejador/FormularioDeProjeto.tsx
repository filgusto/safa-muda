"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarProjeto } from "@/app/actions/projetos.ts";

export function FormularioDeProjeto() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const dados = new FormData(evento.currentTarget);
    const resultado = await criarProjeto({
      nome: String(dados.get("nome")),
      descricao: String(dados.get("descricao") || "") || undefined,
      dataInicio: String(dados.get("dataInicio")),
      horizonteAnos: Number(dados.get("horizonteAnos")),
    });

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível criar o projeto.");
      setEnviando(false);
      return;
    }
    router.push(`/projetos/${resultado.dados!.id}`);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={enviar} className="space-y-6">
      <Campo id="nome" rotulo="Nome do projeto">
        <input
          id="nome"
          name="nome"
          type="text"
          required
          minLength={2}
          placeholder="Ex.: Leira do fundo, Quintal agroflorestal"
          className={CLASSE_DO_CAMPO}
        />
      </Campo>

      <Campo id="descricao" rotulo="Descrição (opcional)">
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          className={CLASSE_DO_CAMPO}
        />
      </Campo>

      <Campo
        id="dataInicio"
        rotulo="Data de implantação"
        ajuda="O planejamento é contado em meses a partir daqui — o mês 0 é este."
      >
        <input
          id="dataInicio"
          name="dataInicio"
          type="date"
          required
          defaultValue={hoje}
          className={CLASSE_DO_CAMPO}
        />
      </Campo>

      <Campo
        id="horizonteAnos"
        rotulo="Horizonte (anos)"
        ajuda="Até onde você quer enxergar. Dá para mudar depois."
      >
        <input
          id="horizonteAnos"
          name="horizonteAnos"
          type="number"
          required
          min={1}
          max={60}
          defaultValue={20}
          className={CLASSE_DO_CAMPO}
        />
      </Campo>

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
        Criar projeto
      </button>
    </form>
  );
}

const CLASSE_DO_CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Campo({
  id,
  rotulo,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {rotulo}
      </label>
      {children}
      {ajuda && <p className="mt-1 text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
}
