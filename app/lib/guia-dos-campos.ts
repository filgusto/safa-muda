/**
 * Explicação de cada campo do formulário de espécie: do que se trata e como
 * preencher. Alimenta o botão "?" ao lado do rótulo (FormularioEspecie.tsx).
 * Separado de CAMPOS para não engordar a definição usada pela validação e
 * pelo diff da moderação.
 */
export interface GuiaDoCampo {
  oQue: string;
  como: string;
  dicas?: string[];
}

const NAO_SEI = "Se a fonte não informa, deixe em branco: não estime.";

export const GUIA_DOS_CAMPOS: Record<string, GuiaDoCampo> = {
  nomeComum: {
    oQue: "Como a planta é chamada popularmente.",
    como: "Use o nome mais usado no Brasil (ex.: Abacate). Se houver outros, coloque-os em “Outros nomes”.",
  },
  nomeCientifico: {
    oQue: "O nome científico (gênero + espécie), que identifica a planta sem ambiguidade.",
    como: "Só o gênero e a espécie, sem autor: gênero em maiúscula, epíteto em minúscula (ex.: Persea americana).",
    dicas: [
      "Fotografe a planta com um aplicativo de identificação, como o Pl@ntNet, o iNaturalist ou o Google Lens — e confira o resultado com uma segunda fonte.",
      "Busque o nome comum no Flora e Funga do Brasil (floradobrasil.jbrj.gov.br), que também confirma o nome aceito.",
      "Confira em livros de referência, como Lorenzi (Árvores Brasileiras) ou o catálogo da Embrapa.",
    ],
  },
  familia: {
    oQue: "A família botânica da espécie.",
    como: "Escreva o nome da família (ex.: Lauraceae). Ele aparece na Flora e Funga do Brasil e no GBIF.",
  },
  sinonimos: {
    oQue: "Outros nomes populares ou científicos pelos quais a planta é conhecida.",
    como: "Um nome por linha. A busca do SAFdex também encontra a espécie por eles.",
  },
  gbifId: {
    oQue: "Ligação com a página da espécie no GBIF, base internacional de biodiversidade.",
    como: "Procure a espécie em gbif.org e cole a URL (gbif.org/species/…) ou só o número do ID. Conferimos se ele existe.",
  },
  inaturalistId: {
    oQue: "Ligação com a página do táxon no iNaturalist.",
    como: "Procure a espécie em inaturalist.org e cole a URL (inaturalist.org/taxa/…) ou só o número do ID. Conferimos se ele existe.",
  },

  estrato: {
    oQue: "A altura do dossel em que a planta cresce e busca luz, do emergente ao rasteiro.",
    como:
      "Escolha o estrato em que a planta passa a maior parte da vida adulta, segundo a fonte. " +
      NAO_SEI,
  },
  sucessao: {
    oQue: "O estágio da sucessão ecológica em que a planta naturalmente aparece: das placentas e pioneiras ao clímax.",
    como: "Escolha o estágio indicado pela fonte. " + NAO_SEI,
  },
  sistema: {
    oQue: "O sistema de manejo em que a espécie se encaixa no consórcio: retomada, acumulação ou abundância.",
    como: "Escolha o sistema indicado pela fonte. " + NAO_SEI,
  },
  grupos: {
    oQue: "Para que a planta serve: fruta, madeira, medicinal, matéria orgânica etc.",
    como: "Marque todos os usos que a fonte cita. Se falta um grupo na lista, descreva-o na observação para quem for avaliar.",
  },
  biomas: {
    oQue: "Os biomas brasileiros onde a espécie ocorre ou se adapta.",
    como: "Marque os biomas citados pela fonte (ex.: Flora e Funga do Brasil informa a ocorrência por bioma).",
  },

  diasParaColherMin: {
    oQue: "O menor tempo, em dias, entre plantar e a primeira colheita.",
    como: "Informe o número de dias da fonte. Se ela dá um valor único, use-o aqui e no máximo. Ex.: 90.",
  },
  diasParaColherMax: {
    oQue: "O maior tempo, em dias, entre plantar e a primeira colheita.",
    como: "Informe o número de dias da fonte. Se ela dá um valor único, repita o mesmo do mínimo.",
  },
  espacamentoEntreLinhasMinM: {
    oQue: "A menor distância recomendada, em metros, entre uma linha de plantio e a vizinha.",
    como: "Meça de centro a centro das linhas. Ex.: 3,5.",
  },
  espacamentoEntreLinhasMaxM: {
    oQue: "A maior distância recomendada, em metros, entre linhas de plantio.",
    como: "Meça de centro a centro das linhas. Se a fonte dá um valor único, repita o do mínimo.",
  },
  espacamentoNaLinhaMinM: {
    oQue: "A menor distância recomendada, em metros, entre uma planta e a seguinte na mesma linha.",
    como: "Meça de tronco a tronco (ex.: 0,5).",
  },
  espacamentoNaLinhaMaxM: {
    oQue: "A maior distância recomendada, em metros, entre plantas na mesma linha.",
    como: "Meça de tronco a tronco. Se a fonte dá um valor único, repita o do mínimo.",
  },

  alturaMaduraM: {
    oQue: "A altura que a planta adulta alcança, em metros.",
    como: "Informe a altura típica da planta madura segundo a fonte (ex.: 12). Não use a maior árvore já vista.",
  },
  cicloDeVida: {
    oQue: "Quanto tempo a planta leva para completar a vida: anual, bienal ou perene.",
    como: "É o ciclo biológico, não o de cultivo. Marque mais de um se variar com o clima.",
  },
  frutificacao: {
    oQue: "Se a planta frutifica uma única vez ou várias.",
    como: "Monocárpica frutifica uma vez e aquela planta (ou haste, como na bananeira) morre. Policárpica frutifica repetidas vezes.",
  },
  mesesDeFrutificacao: {
    oQue: "Os meses do ano em que a planta dá fruto.",
    como: "Marque os meses citados pela fonte. Varia com a região e o clima: cite a região no campo de fonte.",
  },
  habito: {
    oQue: "A forma de vida da planta: erva, arbusto, árvore, palmeira, trepadeira etc.",
    como: "Marque a forma de vida como na Flora e Funga do Brasil. Pode marcar mais de uma se a espécie varia.",
  },
  longevidadeMinAnos: {
    oQue: "O menor número de anos que a planta adulta costuma viver.",
    como: "Conte a vida até a velhice, a partir da fase adulta. Em touceiras (bananeira), use a da touceira.",
  },
  longevidadeMaxAnos: {
    oQue: "O maior número de anos que a planta costuma viver.",
    como: "Deixe vazio se a fonte só diz “mais de N anos”; nesse caso coloque N no mínimo.",
  },
  produtivaAPartirDeMeses: {
    oQue: "Com quantos meses de vida a planta começa a produzir.",
    como:
      "Informe em meses, contados do plantio (ex.: 36 para 3 anos). " + NAO_SEI,
  },

  rebrota: {
    oQue: "Se a planta volta a brotar depois de um corte drástico do tronco.",
    como: "Marque “Rebrota” só se a fonte ou sua observação de campo confirmar que ela se recupera do corte.",
  },
  gemasDeRebrota: {
    oQue: "De onde saem os brotos depois do corte: tronco, colo, raiz ou estruturas subterrâneas.",
    como: "Marque só as origens confirmadas. Isso decide até onde a poda pode ir e de onde para baixo o corte elimina a planta.",
  },

  notas: {
    oQue: "Informações úteis que não cabem nos outros campos.",
    como: "Uma observação por linha: contexto regional, ressalvas, variedades, manejo.",
  },
};
