const todayOverviewEl = document.getElementById("today-overview");

const DIAS_LIMITE_PARADA = 10;
const DIAS_LIMITE_ESTREIA = 30;
const DIAS_LIMITE_MENSAGEM_ESTREIA = 7;

// --- Regras de data (reaproveita diasAte, já usado no resto do app) ---

function diasDesdeTimestamp(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return null;
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  const data = timestamp.toDate();
  data.setHours(0, 0, 0, 0);
  const diff = Math.round((agora - data) / (1000 * 60 * 60 * 24));
  return Number.isNaN(diff) ? null : diff;
}

function getSaudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

// --- Hook: centraliza todo o cálculo do painel numa única passada pelas séries ---
function getTodayOverview(listaSeries) {
  const releasesToday = [];
  const upcoming = [];
  const inactive = [];
  const awaitingRenewal = [];

  listaSeries.forEach((serie) => {
    if (serie.proximaTemporadaData) {
      const dias = diasAte(serie.proximaTemporadaData);

      if (dias !== null && dias === 0) {
        releasesToday.push(serie);
      }

      // Conta tanto estreia de temporada nova (tipo "confirmada") quanto
      // episódio normal de uma temporada em exibição (tipo "em-exibicao") —
      // qualquer lançamento com data conhecida nos próximos 30 dias, sem
      // contar o que já apareceu em "lançamentos de hoje".
      if (dias !== null && dias >= 1 && dias <= DIAS_LIMITE_ESTREIA) {
        upcoming.push(serie);
      }
    }

    if (serie.status === "assistindo" || serie.status === "pausada") {
      const diasParada = diasDesdeTimestamp(serie.progressUpdatedAt);
      if (diasParada !== null && diasParada > DIAS_LIMITE_PARADA) {
        inactive.push({ ...serie, diasParada });
      }
    }

    // "Aguardando renovação": ainda não sabemos o status oficial da série
    // (nunca verificado, ou TMDB devolveu um status que não reconhecemos,
    // como "Pilot"). Séries oficialmente renovadas, canceladas ou
    // encerradas já têm proximaTemporadaTipo preenchido e não entram aqui.
    if (!serie.proximaTemporadaTipo) {
      awaitingRenewal.push(serie);
    }
  });

  upcoming.sort((a, b) => new Date(a.proximaTemporadaData) - new Date(b.proximaTemporadaData));
  inactive.sort((a, b) => b.diasParada - a.diasParada);

  return {
    releasesToday: { count: releasesToday.length, items: releasesToday },
    upcomingPremieres: { count: upcoming.length, nearest: upcoming[0] || null, items: upcoming },
    inactiveSeries: { count: inactive.length, oldest: inactive[0] || null, items: inactive },
    awaitingRenewal: { count: awaitingRenewal.length, items: awaitingRenewal },
    // recentlyChangedDates: o projeto ainda não guarda histórico estruturado
    // de mudança de data (só o texto solto da notificação). Por ora o card
    // fica oculto — ver TodayOverview() abaixo.
  };
}

function getHighlightMessage(overview) {
  if (overview.releasesToday.count > 0) {
    const n = overview.releasesToday.count;
    return `Você tem ${n} novo${n === 1 ? "" : "s"} episódio${n === 1 ? "" : "s"} para assistir hoje.`;
  }

  if (overview.upcomingPremieres.nearest) {
    const proxima = overview.upcomingPremieres.nearest;
    const dias = diasAte(proxima.proximaTemporadaData);
    if (dias !== null && dias <= DIAS_LIMITE_MENSAGEM_ESTREIA) {
      const rotulo = proxima.proximaTemporadaTipo === "confirmada"
        ? `a nova temporada de ${proxima.nome}`
        : `o próximo episódio de ${proxima.nome}`;
      return `Faltam ${dias} dia${dias === 1 ? "" : "s"} para ${rotulo}.`;
    }
  }

  if (overview.inactiveSeries.oldest) {
    return `Você está há ${overview.inactiveSeries.oldest.diasParada} dias sem continuar ${overview.inactiveSeries.oldest.nome}.`;
  }

  return "Nenhuma grande novidade hoje. Continue organizando sua biblioteca.";
}

// --- Itens de detalhe de cada card ---

function renderReleaseTodayItem(serie) {
  const rotulo = serie.proximaTemporadaTipo === "confirmada"
    ? `Temporada ${serie.proximaTemporadaNumero}`
    : "Novo episódio";
  return `<div class="today-item"><span>${escapeHtml(serie.nome)}</span><span class="today-item-meta">${rotulo}</span></div>`;
}

function renderUpcomingItem(serie) {
  const dias = diasAte(serie.proximaTemporadaData);
  const rotuloDias = dias === 1 ? "amanhã" : `em ${dias} dias`;
  const rotuloTemporada = serie.proximaTemporadaTipo === "confirmada"
    ? `Temporada ${serie.proximaTemporadaNumero}`
    : "Novo episódio";
  return `
    <div class="today-item">
      <span>${escapeHtml(serie.nome)}</span>
      <span class="today-item-meta">${rotuloTemporada} · ${rotuloDias}</span>
    </div>
  `;
}

function renderInactiveItem(serie) {
  const assistidas = serie.temporadasAssistidas || [];
  const temporadaAtual = assistidas.length > 0 ? Math.max(...assistidas) : 1;
  return `
    <div class="today-item">
      <span>${escapeHtml(serie.nome)} <span class="today-item-meta">parada há ${serie.diasParada} dias</span></span>
      <button type="button" class="btn-continuar" onclick="event.stopPropagation(); abrirModalEpisodios('${serie.id}', ${temporadaAtual})">Continuar</button>
    </div>
  `;
}

function renderAwaitingItem(serie) {
  return `<div class="today-item"><span>${escapeHtml(serie.nome)}</span></div>`;
}

// --- Componente de card individual ---

function TodayOverviewCard({ id, icone, estado, titulo, texto, itens, renderItem, semDados }) {
  return `
    <div class="today-card-wrap">
      <button
        type="button"
        class="today-card ${estado}"
        data-today-card="${id}"
        aria-expanded="false"
        aria-controls="today-detalhes-${id}"
      >
        <span class="today-card-icone" aria-hidden="true">${icone}</span>
        <span class="today-card-corpo">
          <span class="today-card-titulo">${titulo}</span>
          <span class="today-card-texto">${texto}</span>
        </span>
      </button>
      <div class="today-card-detalhes" id="today-detalhes-${id}" hidden>
        ${itens.length > 0 ? itens.map(renderItem).join("") : `<p class="vazio">${semDados}</p>`}
      </div>
    </div>
  `;
}

function TodayOverviewSkeleton() {
  const cardFalso = `
    <div class="today-card-wrap">
      <div class="today-card skeleton-card">
        <span class="skeleton skeleton-icone"></span>
        <span class="today-card-corpo">
          <span class="skeleton skeleton-linha" style="width:70%"></span>
          <span class="skeleton skeleton-linha" style="width:90%"></span>
        </span>
      </div>
    </div>
  `;

  return `
    <div class="today-header">
      <span class="skeleton skeleton-linha" style="width:160px;height:1.3rem;"></span>
      <span class="skeleton skeleton-linha" style="width:280px;height:1rem;margin-top:0.5rem;"></span>
    </div>
    <div class="today-cards-grid">${cardFalso}${cardFalso}${cardFalso}${cardFalso}</div>
  `;
}

// --- Componente principal ---

function TodayOverview() {
  if (!seriesCarregadas) {
    todayOverviewEl.innerHTML = TodayOverviewSkeleton();
    return;
  }

  const overview = getTodayOverview(series);
  const saudacao = getSaudacao();
  const mensagem = getHighlightMessage(overview);

  const cards = [
    TodayOverviewCard({
      id: "lancamentos",
      icone: "🎬",
      estado: overview.releasesToday.count > 0 ? "positivo" : "neutro",
      titulo: overview.releasesToday.count > 0
        ? `${overview.releasesToday.count} lançamento${overview.releasesToday.count === 1 ? "" : "s"} hoje`
        : "Nenhum lançamento hoje",
      texto: overview.releasesToday.count > 0 ? "Toque para ver os detalhes" : "Sua agenda está tranquila.",
      itens: overview.releasesToday.items,
      renderItem: renderReleaseTodayItem,
      semDados: "Nenhum lançamento hoje.",
    }),
    TodayOverviewCard({
      id: "estreias",
      icone: "🗓️",
      estado: overview.upcomingPremieres.count > 0 ? "informativo" : "neutro",
      titulo: overview.upcomingPremieres.count > 0
        ? `${overview.upcomingPremieres.count} lançamento${overview.upcomingPremieres.count === 1 ? "" : "s"} chegando`
        : "Nenhum lançamento em 30 dias",
      texto: overview.upcomingPremieres.nearest
        ? `O mais próximo é em ${diasAte(overview.upcomingPremieres.nearest.proximaTemporadaData)} dias.`
        : "Nenhum lançamento previsto para os próximos 30 dias.",
      itens: overview.upcomingPremieres.items,
      renderItem: renderUpcomingItem,
      semDados: "Nenhum lançamento previsto para os próximos 30 dias.",
    }),
    TodayOverviewCard({
      id: "paradas",
      icone: "⏸️",
      estado: overview.inactiveSeries.count > 0 ? "atencao" : "neutro",
      titulo: overview.inactiveSeries.count > 0
        ? `${overview.inactiveSeries.count} série${overview.inactiveSeries.count === 1 ? "" : "s"} parada${overview.inactiveSeries.count === 1 ? "" : "s"}`
        : "Nenhuma série parada",
      texto: overview.inactiveSeries.oldest
        ? `Você não atualiza ${overview.inactiveSeries.oldest.nome} há ${overview.inactiveSeries.oldest.diasParada} dias.`
        : "Você não possui séries paradas.",
      itens: overview.inactiveSeries.items,
      renderItem: renderInactiveItem,
      semDados: "Você não possui séries paradas.",
    }),
    TodayOverviewCard({
      id: "renovacao",
      icone: "❔",
      estado: "neutro",
      titulo: overview.awaitingRenewal.count > 0
        ? `${overview.awaitingRenewal.count} aguardando renovação`
        : "Tudo com status definido",
      texto: overview.awaitingRenewal.count > 0
        ? "Ainda não existem novidades oficiais."
        : "Todas as suas séries possuem um status definido.",
      itens: overview.awaitingRenewal.items,
      renderItem: renderAwaitingItem,
      semDados: "Todas as suas séries possuem um status definido.",
    }),
    // Card "Datas alteradas": o projeto ainda não guarda histórico
    // estruturado de mudança de data, só o texto solto da notificação.
    // Por instrução da sprint, o card fica oculto até essa estrutura
    // existir — nada de dado fictício aqui.
  ].join("");

  todayOverviewEl.innerHTML = `
    <div class="today-header">
      <p class="today-saudacao">${saudacao}</p>
      <p class="today-mensagem">${escapeHtml(mensagem)}</p>
    </div>
    <h2 class="today-titulo-secao">Hoje no Series Tracker</h2>
    <div class="today-cards-grid">${cards}</div>
  `;
}

todayOverviewEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-today-card]");
  if (!botao) return;

  const id = botao.dataset.todayCard;
  const detalhes = document.getElementById(`today-detalhes-${id}`);
  const jaAberto = !detalhes.hidden;

  todayOverviewEl.querySelectorAll(".today-card-detalhes").forEach((el) => {
    el.hidden = true;
  });
  todayOverviewEl.querySelectorAll(".today-card").forEach((el) => {
    el.setAttribute("aria-expanded", "false");
  });

  if (!jaAberto) {
    detalhes.hidden = false;
    botao.setAttribute("aria-expanded", "true");
  }
});

TodayOverview();
