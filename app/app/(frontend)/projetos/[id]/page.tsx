import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/access.ts";
import {
  buscarProjeto,
  listarPlantios,
  podeEditarProjeto,
} from "@/lib/projetos.ts";
import { Workspace } from "@/components/planejador/Workspace.tsx";
import { listarAreas, listarPlantiosEspaciais } from "@/lib/espaco.ts";
import { listarEventos, eventosPorPlantio } from "@/lib/diario.ts";
import { montarAnalise } from "@/lib/analise.ts";
import { estadoRealizado, desvioDaImplantacao } from "@/core/diario.ts";
import type { PlantioLocal } from "@/components/planejador/tipos.ts";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const viewer = await getViewer();
  const projeto = await buscarProjeto((await params).id, viewer);
  return {
    title: projeto ? `${projeto.nome} · Safa Muda` : "Projeto · Safa Muda",
  };
}

export default async function ProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();

  const projeto = await buscarProjeto(id, viewer);

  // `buscarProjeto` já aplica a política de acesso e devolve null quando o
  // viewer não pode ler — inclusive para projeto que existe mas é privado.
  if (!projeto) {
    if (!viewer) redirect(`/entrar?destino=/projetos/${id}`);
    notFound();
  }

  const [plantios, podeEditar, areas, plantiosEspaciais, eventos, porPlantio] =
    await Promise.all([
      listarPlantios(projeto.id),
      podeEditarProjeto(projeto.id, viewer),
      listarAreas(projeto.id),
      listarPlantiosEspaciais(projeto.id),
      listarEventos(projeto.id),
      eventosPorPlantio(projeto.id),
    ]);

  const analise = await montarAnalise(projeto.id);

  // Cruza o planejado com o que o diário registrou. A derivação é feita aqui,
  // no servidor, para que a timeline receba o estado pronto.
  const plantiosComRealizado = plantios.map((plantio) => {
    const doPlantio = porPlantio.get(plantio.id) ?? [];
    return {
      ...plantio,
      realizado: estadoRealizado(doPlantio),
      desvioMeses: desvioDaImplantacao({
        inicioDoProjeto: projeto.dataInicio,
        mesPlanejado: plantio.mesInicio,
        eventos: doPlantio,
      }),
    };
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Workspace
        nome={projeto.nome}
        projectId={projeto.id}
        horizonteMeses={projeto.horizonteMeses}
        dataInicio={projeto.dataInicio.toISOString()}
        plantios={plantiosComRealizado as PlantioLocal[]}
        areas={areas}
        plantiosEspaciais={plantiosEspaciais}
        eventos={eventos}
        analise={analise}
        podeEditar={podeEditar}
      />
    </div>
  );
}
