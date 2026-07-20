const dashboardStatsEl = document.getElementById("dashboard-stats");
const dashboardLancamentosEl = document.getElementById("dashboard-lancamentos");
const dashboardContinuarEl = document.getElementById("dashboard-continuar");
const dashboardResumoEl = document.getElementById("dashboard-resumo");
const dashboardAtividadesEl = document.getElementById("dashboard-atividades");

const CARDS_ESTATISTICAS = [
  { chave: "total", icone: "📺", titulo: "Séries cadastradas", descricao: "No total" },
  { chave: "assistindo", icone: "▶️", titulo: "Assistindo", descricao: "Em andamento agora" },
  { chave: "completa", icone: "✅", titulo: "Concluídas", descricao: "Você já terminou" },
  { chave: "pausada", icone: "⏸️", titulo: "Em pausa", descricao: "Aguardando retomar" },
  { chave: "quero-assistir", icone: "📌", titulo: "Quero assistir", descricao: "Na fila" },
  { chave: "cancelada", icone: "❌", titulo: "Canceladas", descricao: "Canceladas pelo estúdio" },
  { chave: "encerrada", icone: "🏁", titulo: "Finalizadas", descricao: "Sem novas temporadas" },
];

const CORES_RESUMO = {
  assistindo: "var(--cor-informativo)",
  completa: "var(--cor-positivo)",
  pausada: "var(--cor-atencao)",
  "quero-assistir": "#f1c40f",
  cancelada: "var(--cor-alerta)",
  encerrada: "#7f8c8d",
};

const ROTULOS_RESUMO = {
  assistindo: "Assistindo",
  completa: "Concluídas",
  pausada: "Em pausa",
  "quero-assistir": "Quero assistir",
  cancelada: "Canceladas",
  encerrada: "Finalizadas",
};

const ICONES_ATIVIDADE = {
  adicionada: "➕",
  "status-alterado": "🔁",
  "temporada-concluida": "✅",
  removida: "🗑️",
};

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Hook: centraliza o cálculo das estatísticas para todos os cards/gráfico
// usarem o mesmo resultado, em vez de cada seção recalcular por conta própria.
function useEstatisticasBiblioteca(listaSeries) {
  const estatisticas = {
    total: listaSeries.length,
    assistindo: 0,
    completa: 0,
    pausada: 0,
    "quero-assistir": 0,
    cancelada: 0,
    encerrada: 0,
  };

  listaSeries.forEach((serie) => {
    if (estatisticas[serie.status] !== undefined) estatisticas[serie.status] += 1;
    if (serie.cancelada) estatisticas.cancelada += 1;
    if (serie.proximaTemporadaTipo === "encerrada") estatisticas.encerrada += 1;
  });

  return estatisticas;
}

function formatarDataAmigavel(dataIso) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return `${dia} ${MESES_PT[mes - 1]}`;
}

function DashboardStats(estatisticas) {
  dashboardStatsEl.innerHTML = CARDS_ESTATISTICAS.map(
    (card) => `
      <div class="stat-card-dashboard">
        <span class="stat-icone">${card.icone}</span>
        <span class="stat-valor">${estatisticas[card.chave] ?? 0}</span>
        <span class="stat-titulo">${card.titulo}</span>
        <span class="stat-descricao">${card.descricao}</span>
      </div>
    `
  ).join("");
}

function UpcomingReleases(listaSeries) {
  const proximos = listaSeries
    .filter((s) => s.proximaTemporadaData && diasAte(s.proximaTemporadaData) >= 0)
    .sort((a, b) => new Date(a.proximaTemporadaData) - new Date(b.proximaTemporadaData))
    .slice(0, 5);

  if (proximos.length === 0) {
    dashboardLancamentosEl.innerHTML = '<p class="vazio">Nenhum lançamento previsto no momento.</p>';
    return;
  }

  dashboardLancamentosEl.innerHTML = proximos
    .map((serie) => {
      const dias = diasAte(serie.proximaTemporadaData);
      const poster = serie.poster
        ? `<img src="${serie.poster}" alt="">`
        : '<div class="poster-vazio-grande">🎬</div>';
      const rotuloDias = dias === 0 ? "É hoje!" : dias === 1 ? "Falta 1 dia" : `Faltam ${dias} dias`;

      return `
        <div class="lancamento-item">
          <div class="lancamento-poster">${poster}</div>
          <div class="lancamento-info">
            <span class="lancamento-nome">${escapeHtml(serie.nome)}</span>
            ${serie.proximaTemporadaNumero ? `<span class="lancamento-temporada">Temporada ${serie.proximaTemporadaNumero}</span>` : ""}
            <span class="lancamento-data">${formatarDataAmigavel(serie.proximaTemporadaData)}</span>
            <span class="lancamento-contagem">${rotuloDias}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function ContinueWatching(listaSeries) {
  const assistindo = listaSeries.filter((s) => s.status === "assistindo");

  if (assistindo.length === 0) {
    dashboardContinuarEl.innerHTML = '<p class="vazio">Nenhuma série em andamento no momento.</p>';
    return;
  }

  dashboardContinuarEl.innerHTML = assistindo
    .map((serie) => {
      const assistidas = serie.temporadasAssistidas || [];
      const ultimaAssistida = assistidas.length > 0 ? Math.max(...assistidas) : null;
      const temporadaAtual = ultimaAssistida || 1;
      const poster = serie.poster
        ? `<img src="${serie.poster}" alt="">`
        : '<div class="poster-vazio-grande">🎬</div>';

      return `
        <div class="continuar-item">
          <div class="continuar-poster">${poster}</div>
          <div class="continuar-info">
            <span class="continuar-nome">${escapeHtml(serie.nome)}</span>
            <span class="continuar-meta">Temporada ${temporadaAtual}${serie.temporadas ? ` de ${serie.temporadas}` : ""}</span>
            <span class="continuar-meta">${ultimaAssistida ? `Última temporada assistida: ${ultimaAssistida}` : "Nenhuma temporada marcada ainda"}</span>
          </div>
          <button type="button" class="btn-continuar" onclick="abrirModalEpisodios('${serie.id}', ${temporadaAtual})">Continuar</button>
        </div>
      `;
    })
    .join("");
}

function LibrarySummary(estatisticas) {
  const chaves = Object.keys(ROTULOS_RESUMO);
  const totalFatias = chaves.reduce((soma, chave) => soma + estatisticas[chave], 0);

  if (totalFatias === 0) {
    dashboardResumoEl.innerHTML = `
      <div class="donut donut-vazio"></div>
      <p class="vazio">Adicione séries para ver o resumo aqui.</p>
    `;
    return;
  }

  let acumulado = 0;
  const fatias = chaves
    .filter((chave) => estatisticas[chave] > 0)
    .map((chave) => {
      const inicio = (acumulado / totalFatias) * 360;
      acumulado += estatisticas[chave];
      const fim = (acumulado / totalFatias) * 360;
      return `${CORES_RESUMO[chave]} ${inicio}deg ${fim}deg`;
    });

  const legenda = chaves
    .filter((chave) => estatisticas[chave] > 0)
    .map(
      (chave) => `
        <div class="legenda-item">
          <span class="legenda-cor" style="background:${CORES_RESUMO[chave]}"></span>
          <span>${ROTULOS_RESUMO[chave]}</span>
          <span class="legenda-valor">${estatisticas[chave]}</span>
        </div>
      `
    )
    .join("");

  dashboardResumoEl.innerHTML = `
    <div class="donut" style="background: conic-gradient(${fatias.join(", ")})">
      <div class="donut-centro">
        <strong>${estatisticas.total}</strong>
        <span>séries</span>
      </div>
    </div>
    <div class="donut-legenda">${legenda}</div>
  `;
}

function RecentActivity(listaAtividades) {
  if (listaAtividades.length === 0) {
    dashboardAtividadesEl.innerHTML = '<p class="vazio">Nenhuma atividade registrada ainda.</p>';
    return;
  }

  dashboardAtividadesEl.innerHTML = listaAtividades
    .map(
      (atividade) => `
        <div class="atividade-item">
          <span class="atividade-icone">${ICONES_ATIVIDADE[atividade.tipo] || "•"}</span>
          <div class="atividade-info">
            <span class="atividade-serie">${escapeHtml(atividade.serieNome)}</span>
            <span class="atividade-descricao">${escapeHtml(atividade.descricao)}</span>
          </div>
          <span class="atividade-data">${atividade.criadoEm ? atividade.criadoEm.toDate().toLocaleDateString("pt-BR") : "agora"}</span>
        </div>
      `
    )
    .join("");
}

function renderizarDashboard() {
  const estatisticas = useEstatisticasBiblioteca(series);
  DashboardStats(estatisticas);
  UpcomingReleases(series);
  ContinueWatching(series);
  LibrarySummary(estatisticas);
  RecentActivity(atividades);
}
