const timelineEl = document.getElementById("timeline-conteudo");

const MESES_ABREV_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MESES_COMPLETOS_PT = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

// --- Regras de data (reaproveita diasAte/formatarDataTMDB, já usados no resto do app) ---

function getDaysUntilRelease(dataIso) {
  return diasAte(dataIso);
}

function formatReleaseDate(dataIso) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return `${String(dia).padStart(2, "0")} ${MESES_ABREV_PT[mes - 1]}`;
}

function getRelativeDateLabel(dias) {
  if (dias === 0) return "Estreia hoje";
  if (dias === 1) return "Estreia amanhã";
  return `Faltam ${dias} dias`;
}

function groupReleasesByMonth(itens) {
  const grupos = new Map();

  itens.forEach((item) => {
    const [ano, mes] = item.releaseDate.split("-").map(Number);
    const chave = `${ano}-${mes}`;
    if (!grupos.has(chave)) grupos.set(chave, { ano, mes, itens: [] });
    grupos.get(chave).itens.push(item);
  });

  return [...grupos.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

// --- Hook: centraliza a obtenção e as regras de negócio da Timeline ---
function getTimelineData(listaSeries) {
  const comData = [];
  const semData = [];

  listaSeries.forEach((serie) => {
    if (serie.proximaTemporadaData) {
      const dias = getDaysUntilRelease(serie.proximaTemporadaData);
      if (dias !== null && dias >= 0) {
        comData.push({
          id: serie.id,
          seriesId: serie.id,
          seriesName: serie.nome,
          posterUrl: serie.poster || null,
          seasonNumber: serie.proximaTemporadaNumero || null,
          releaseDate: serie.proximaTemporadaData,
          dias,
          distribuidoras: serie.distribuidoras || [],
        });
      }
    } else if (serie.proximaTemporadaTipo === "sem-data") {
      // Renovada oficialmente, mas o TMDB ainda não anunciou uma data —
      // não inventamos ano/temporada aqui, só o que já sabemos de verdade.
      semData.push({
        id: serie.id,
        seriesName: serie.nome,
        seasonNumber: serie.proximaTemporadaNumero || null,
      });
    }
  });

  comData.sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));

  return {
    grupos: groupReleasesByMonth(comData),
    semData,
  };
}

// --- Componentes ---

function TimelineItem(item) {
  const ehHoje = item.dias === 0;
  const rotuloDia = ehHoje ? "HOJE" : formatReleaseDate(item.releaseDate);
  const poster = item.posterUrl
    ? `<img src="${item.posterUrl}" alt="">`
    : '<div class="poster-vazio-grande">🎬</div>';
  const plataforma = item.distribuidoras[0]
    ? `<span class="timeline-plataforma">${escapeHtml(item.distribuidoras[0])}</span>`
    : "";

  return `
    <div class="timeline-item ${ehHoje ? "hoje" : ""}">
      <span class="timeline-dia">${rotuloDia}</span>
      <div class="timeline-poster">${poster}</div>
      <div class="timeline-info">
        <span class="timeline-nome">${escapeHtml(item.seriesName)}</span>
        ${item.seasonNumber ? `<span class="timeline-meta">Temporada ${item.seasonNumber}</span>` : ""}
        <span class="timeline-dias">${getRelativeDateLabel(item.dias)}</span>
        ${plataforma}
      </div>
      <button type="button" class="btn-ver-serie" data-abrir-serie="${escapeHtml(item.seriesName)}">Ver detalhes</button>
    </div>
  `;
}

function TimelineMonthGroup(grupo) {
  return `
    <div class="timeline-mes-grupo">
      <h3 class="timeline-mes-titulo">${MESES_COMPLETOS_PT[grupo.mes - 1]} ${grupo.ano}</h3>
      <div class="timeline-linha">
        ${grupo.itens.map(TimelineItem).join("")}
      </div>
    </div>
  `;
}

function TimelineSemDataItem(item) {
  return `
    <div class="timeline-item sem-marcador">
      <div class="timeline-info">
        <span class="timeline-nome">${escapeHtml(item.seriesName)}</span>
        ${item.seasonNumber ? `<span class="timeline-meta">Temporada ${item.seasonNumber}</span>` : ""}
        <span class="timeline-dias">Sem data confirmada</span>
      </div>
      <button type="button" class="btn-ver-serie" data-abrir-serie="${escapeHtml(item.seriesName)}">Ver detalhes</button>
    </div>
  `;
}

function TimelineSemData(lista) {
  if (lista.length === 0) return "";
  return `
    <div class="timeline-mes-grupo">
      <h3 class="timeline-mes-titulo">DATA A CONFIRMAR</h3>
      <div class="timeline-linha sem-linha">
        ${lista.map(TimelineSemDataItem).join("")}
      </div>
    </div>
  `;
}

function TimelineEmptyState({ temSemData }) {
  if (temSemData) {
    return `
      <div class="vazio-grande">
        <p>Nenhuma estreia possui data confirmada.</p>
        <p class="vazio-sub">Confira abaixo as temporadas aguardando anúncio.</p>
      </div>
    `;
  }

  return `
    <div class="vazio-grande">
      <p>Nenhum lançamento confirmado.</p>
      <p class="vazio-sub">As próximas temporadas aparecerão aqui quando uma data for cadastrada.</p>
    </div>
  `;
}

function TimelineSkeleton() {
  const linhaFalsa = `
    <div class="timeline-item">
      <span class="skeleton skeleton-linha" style="width:40px;height:0.9rem;"></span>
      <div class="timeline-poster"><span class="skeleton" style="width:100%;height:100%;display:block;"></span></div>
      <div class="timeline-info">
        <span class="skeleton skeleton-linha" style="width:60%"></span>
        <span class="skeleton skeleton-linha" style="width:40%"></span>
      </div>
    </div>
  `;

  return `
    <div class="timeline-mes-grupo">
      <span class="skeleton skeleton-linha" style="width:140px;height:1rem;margin-bottom:1rem;"></span>
      <div class="timeline-linha">${linhaFalsa}${linhaFalsa}</div>
    </div>
  `;
}

// --- Componente principal ---

function TimelinePage() {
  if (!seriesCarregadas) {
    timelineEl.innerHTML = TimelineSkeleton();
    return;
  }

  try {
    const { grupos, semData } = getTimelineData(series);

    if (grupos.length === 0 && semData.length === 0) {
      timelineEl.innerHTML = TimelineEmptyState({ temSemData: false });
      return;
    }

    const gruposHtml = grupos.length > 0
      ? grupos.map(TimelineMonthGroup).join("")
      : TimelineEmptyState({ temSemData: true });

    timelineEl.innerHTML = `${gruposHtml}${TimelineSemData(semData)}`;
  } catch (erro) {
    timelineEl.innerHTML = `
      <div class="vazio-grande">
        <p>Não foi possível carregar a Timeline.</p>
        <button type="button" class="btn-secundario btn-tentar-novamente">Tentar novamente</button>
      </div>
    `;
  }
}

function abrirSerieNaLista(nomeSerie) {
  mudarTab("lista");
  buscaListaEl.value = nomeSerie;
  textoBuscaLista = nomeSerie;
  renderizar();
}

timelineEl.addEventListener("click", (evento) => {
  if (evento.target.closest(".btn-tentar-novamente")) {
    TimelinePage();
    return;
  }

  const botao = evento.target.closest("[data-abrir-serie]");
  if (botao) abrirSerieNaLista(botao.dataset.abrirSerie);
});

TimelinePage();
