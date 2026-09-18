"use client";

import { useState } from "react";
import { Loader2, Grid3x3, MapPin, Download } from "lucide-react";
import {
  gerarLinhasNaArea,
  georreferenciarArea,
} from "@/app/actions/espaco.ts";
import { localParaWgs84 } from "@/core/geo.ts";
import type { AreaComLinhas } from "@/lib/espaco.ts";
import { SATELITE_CONFIGURADO } from "@/lib/tiles.ts";

/**
 * Controles da área: geração paramétrica de linhas, georreferência e
 * exportação.
 */
export function ControlesDaArea({
  area,
  projectId,
  podeEditar,
  onMudanca,
}: {
  area: AreaComLinhas;
  projectId: string;
  podeEditar: boolean;
  onMudanca: () => void;
}) {
  return (
    <div className="space-y-6">
      <Bloco titulo="Área" icone={<MapPin size={13} />}>
        <dl className="space-y-1 text-xs">
          <Medida rotulo="Superfície" valor={formatarArea(area.areaM2)} />
          <Medida rotulo="Vértices" valor={String(area.geomLocal.length)} />
          <Medida rotulo="Linhas" valor={String(area.linhas.length)} />
        </dl>
      </Bloco>

      {podeEditar && (
        <GerarLinhas area={area} projectId={projectId} onMudanca={onMudanca} />
      )}

      <Georreferencia
        area={area}
        projectId={projectId}
        podeEditar={podeEditar}
        onMudanca={onMudanca}
      />

      <Exportacao area={area} />
    </div>
  );
}

function GerarLinhas({
  area,
  projectId,
  onMudanca,
}: {
  area: AreaComLinhas;
  projectId: string;
  onMudanca: () => void;
}) {
  const [direcao, setDirecao] = useState(0);
  const [espacamento, setEspacamento] = useState(3);
  const [bordadura, setBordadura] = useState(1);
  const [tipo, setTipo] = useState<"plantio" | "entrelinha" | "servico">(
    "plantio",
  );
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setProcessando(true);
    setErro(null);
    setMensagem(null);

    const resultado = await gerarLinhasNaArea({
      projectId,
      areaId: area.id,
      direcaoGraus: direcao,
      espacamentoM: espacamento,
      bordaduraM: bordadura,
      tipo,
    });

    setProcessando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível gerar.");
      return;
    }
    setMensagem(`${resultado.dados!.total} linhas geradas.`);
    onMudanca();
  }

  return (
    <Bloco titulo="Gerar linhas" icone={<Grid3x3 size={13} />}>
      <div className="grid grid-cols-2 gap-2">
        <Numero
          rotulo="Direção"
          unidade="°"
          valor={direcao}
          min={-180}
          max={180}
          passo={5}
          onChange={setDirecao}
        />
        <Numero
          rotulo="Entre linhas"
          unidade="m"
          valor={espacamento}
          min={0.1}
          max={200}
          passo={0.5}
          onChange={setEspacamento}
        />
        <Numero
          rotulo="Bordadura"
          unidade="m"
          valor={bordadura}
          min={0}
          max={100}
          passo={0.5}
          onChange={setBordadura}
        />
        <label className="block">
          <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            Tipo
          </span>
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as typeof tipo)}
            className={CLASSE_DO_CAMPO}
          >
            <option value="plantio">Plantio</option>
            <option value="entrelinha">Entrelinha</option>
            <option value="servico">Serviço</option>
          </select>
        </label>
      </div>

      <p className="mt-2 text-[0.7rem] leading-[1.6] text-muted-foreground">
        Substitui as linhas existentes deste tipo. Direção 0° é leste-oeste.
      </p>

      <button
        type="button"
        onClick={gerar}
        disabled={processando}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary px-4 py-1.5 text-xs font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {processando && <Loader2 size={13} className="animate-spin" />}
        Gerar
      </button>

      {mensagem && <Aviso tom="ok">{mensagem}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
    </Bloco>
  );
}

function Georreferencia({
  area,
  projectId,
  podeEditar,
  onMudanca,
}: {
  area: AreaComLinhas;
  projectId: string;
  podeEditar: boolean;
  onMudanca: () => void;
}) {
  const [lat, setLat] = useState(area.anchorLat ?? 0);
  const [lon, setLon] = useState(area.anchorLon ?? 0);
  const [rotacao, setRotacao] = useState(area.rotationDeg);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const georreferenciada = area.anchorLat !== null && area.anchorLon !== null;

  async function salvar(limpar = false) {
    setSalvando(true);
    setErro(null);

    const resultado = await georreferenciarArea({
      id: area.id,
      projectId,
      anchorLat: limpar ? null : lat,
      anchorLon: limpar ? null : lon,
      rotationDeg: limpar ? 0 : rotacao,
    });

    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    onMudanca();
  }

  return (
    <Bloco titulo="Georreferência" icone={<MapPin size={13} />}>
      <p className="mb-2 text-[0.7rem] leading-[1.6] text-muted-foreground">
        Opcional. O croqui funciona sem ela; preencher só ancora o desenho no
        mundo, sem alterar nenhuma medida.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Numero
          rotulo="Latitude"
          valor={lat}
          min={-90}
          max={90}
          passo={0.00001}
          onChange={setLat}
          desabilitado={!podeEditar}
        />
        <Numero
          rotulo="Longitude"
          valor={lon}
          min={-180}
          max={180}
          passo={0.00001}
          onChange={setLon}
          desabilitado={!podeEditar}
        />
        <Numero
          rotulo="Rotação"
          unidade="°"
          valor={rotacao}
          min={-180}
          max={180}
          passo={1}
          onChange={setRotacao}
          desabilitado={!podeEditar}
        />
      </div>

      {georreferenciada && !SATELITE_CONFIGURADO && (
        <p className="mt-2 text-[0.7rem] leading-[1.6] text-muted-foreground">
          O fundo de mapa já está disponível. Para imagem de satélite, defina
          <code className="mx-1">NEXT_PUBLIC_SATELLITE_TILE_URL</code>
          no ambiente — provedores de imagem aérea têm termos de uso próprios, e
          escolher um por padrão imporia essa decisão a quem hospeda.
        </p>
      )}

      {podeEditar && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => salvar(false)}
            disabled={salvando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {salvando && <Loader2 size={13} className="animate-spin" />}
            Ancorar
          </button>
          {georreferenciada && (
            <button
              type="button"
              onClick={() => salvar(true)}
              disabled={salvando}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}
    </Bloco>
  );
}

function Exportacao({ area }: { area: AreaComLinhas }) {
  const georreferenciada = area.anchorLat !== null && area.anchorLon !== null;

  function baixarGeoJson() {
    const georref = {
      anchorLat: area.anchorLat!,
      anchorLon: area.anchorLon!,
      rotationDeg: area.rotationDeg,
    };

    const paraCoordenadas = (pontos: { x: number; y: number }[]) =>
      pontos.map((ponto) => {
        const wgs = localParaWgs84(ponto, georref);
        return [wgs.lon, wgs.lat];
      });

    const anel = paraCoordenadas(area.geomLocal);
    // GeoJSON exige o anel fechado: primeiro ponto repetido no fim.
    anel.push(anel[0]!);

    const colecao = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { nome: area.nome, area_m2: area.areaM2, tipo: "area" },
          geometry: { type: "Polygon", coordinates: [anel] },
        },
        ...area.linhas.map((linha) => ({
          type: "Feature",
          properties: {
            tipo: linha.tipo,
            rotulo: linha.rotulo,
            comprimento_m: linha.comprimentoM,
          },
          geometry: {
            type: "LineString",
            coordinates: paraCoordenadas(linha.pathLocal),
          },
        })),
      ],
    };

    baixar(
      new Blob([JSON.stringify(colecao, null, 2)], {
        type: "application/geo+json",
      }),
      `${area.nome.replace(/\s+/g, "-").toLowerCase()}.geojson`,
    );
  }

  function baixarSvg() {
    const svg = document.querySelector<SVGSVGElement>("svg[aria-label]");
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // O SVG usa variáveis CSS que não existem fora da página; resolvemos aqui.
    const estilos = getComputedStyle(document.documentElement);
    let texto = new XMLSerializer().serializeToString(clone);
    for (const variavel of [
      "--fundo-croqui",
      "--cor-malha",
      "--cor-area",
      "--cor-borda-area",
      "--cor-plantio",
      "--cor-entrelinha",
      "--cor-servico",
    ]) {
      texto = texto.replaceAll(
        `var(${variavel})`,
        estilos.getPropertyValue(variavel).trim() || "#000",
      );
    }

    baixar(
      new Blob([texto], { type: "image/svg+xml" }),
      `${area.nome.replace(/\s+/g, "-").toLowerCase()}-croqui.svg`,
    );
  }

  return (
    <Bloco titulo="Exportar" icone={<Download size={13} />}>
      <div className="space-y-2">
        <button
          type="button"
          onClick={baixarSvg}
          className="w-full rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Croqui em SVG
        </button>
        <button
          type="button"
          onClick={baixarGeoJson}
          disabled={!georreferenciada}
          title={
            georreferenciada
              ? undefined
              : "Precisa de georreferência: GeoJSON usa latitude e longitude."
          }
          className="w-full rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          GeoJSON (WGS84)
        </button>
      </div>
      <p className="mt-2 text-[0.7rem] leading-[1.6] text-muted-foreground">
        Para PDF, use imprimir do navegador — o croqui sai na escala da tela.
      </p>
    </Bloco>
  );
}

// ── Peças ────────────────────────────────────────────────────────────────────

const CLASSE_DO_CAMPO =
  "w-full rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";

function Bloco({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
        {icone}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Numero({
  rotulo,
  unidade,
  valor,
  min,
  max,
  passo,
  onChange,
  desabilitado,
}: {
  rotulo: string;
  unidade?: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  onChange: (valor: number) => void;
  desabilitado?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
        {rotulo}
        {unidade && ` (${unidade})`}
      </span>
      <input
        type="number"
        value={valor}
        min={min}
        max={max}
        step={passo}
        disabled={desabilitado}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className={CLASSE_DO_CAMPO}
      />
    </label>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="font-mono uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="metric">{valor}</dd>
    </div>
  );
}

function Aviso({
  tom,
  children,
}: {
  tom: "ok" | "erro";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tom === "erro" ? "alert" : "status"}
      className={`mt-2 rounded-lg border-l-4 p-2 text-[0.7rem] leading-[1.5] ${
        tom === "ok"
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
          : "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-200"
      }`}
    >
      {children}
    </p>
  );
}

export function formatarArea(m2: number): string {
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

function baixar(conteudo: Blob, nome: string) {
  const url = URL.createObjectURL(conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
