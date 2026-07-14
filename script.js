const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";

const statusLabel = {
  "quero-assistir": "Quero assistir",
  "assistindo": "Assistindo",
  "completa": "Completa",
};

const coresDistribuidora = {
  "Netflix": "#e50914",
  "Prime Video": "#00a8e1",
  "Amazon Prime Video": "#00a8e1",
  "Apple TV Amazon Channel": "#00a8e1",
  "Disney+": "#113ccf",
  "Max": "#8b5cf6",
  "Apple TV+": "#a2aaad",
  "Apple TV": "#a2aaad",
  "Paramount+": "#0064ff",
  "Globoplay": "#ff6600",
  "Star+": "#0f0f0f",
};

function corDistribuidora(nome) {
  return coresDistribuidora[nome] || "#8b5cf6";
}

let series = [];
let seriesRef = null;
let unsubscribeSeries = null;
let distribuidoraSelecionada = "todas";
let textoBuscaLista = "";
let ordemSelecionada = "recentes";
let editandoNotaId = null;
let serieSelecionada = null;
let distribuidorasEditaveis = [];

const buscaNomeEl = document.getElementById("busca-nome");
const btnBuscarEl = document.getElementById("btn-buscar");
const resultadosBuscaEl = document.getElementById("resultados-busca");

const form = document.getElementById("form-serie");
const previewBackdropEl = document.getElementById("preview-backdrop");
const previewPosterEl = document.getElementById("preview-poster");
const previewNomeEl = document.getElementById("preview-nome");
const previewTaglineEl = document.getElementById("preview-tagline");
const previewNotaTmdbEl = document.getElementById("preview-nota-tmdb");
const previewGenerosEl = document.getElementById("preview-generos");
const previewSinopseEl = document.getElementById("preview-sinopse");
const previewTrailerEl = document.getElementById("preview-trailer");
const previewProximaTemporadaEl = document.getElementById("preview-proxima-temporada");
const previewDistribuidorasEl = document.getElementById("preview-distribuidoras");
const previewTemporadasEl = document.getElementById("preview-temporadas");
const previewCanceladaEl = document.getElementById("preview-cancelada");
const avisoSemDistribuidoraEl = document.getElementById("aviso-sem-distribuidora");
const distribuidoraManualEl = document.getElementById("distribuidora-manual");
const btnAddDistribuidoraEl = document.getElementById("btn-add-distribuidora");

const listaEl = document.getElementById("lista-series");
const filtroEl = document.getElementById("filtro-distribuidora");
const buscaListaEl = document.getElementById("busca-lista");
const ordenarListaEl = document.getElementById("ordenar-lista");
const continuarSecaoEl = document.getElementById("continuar-assistindo-secao");
const continuarGridEl = document.getElementById("continuar-assistindo-grid");
const btnAtualizarTemporadasEl = document.getElementById("btn-atualizar-temporadas");
const statusAtualizarTemporadasEl = document.getElementById("status-atualizar-temporadas");

const tabButtons = document.querySelectorAll(".tab-btn");
const paineisTab = {
  consultar: document.getElementById("painel-consultar"),
  lista: document.getElementById("painel-lista"),
};

function mudarTab(nomeTab) {
  tabButtons.forEach((botao) => botao.classList.toggle("ativa", botao.dataset.tab === nomeTab));
  Object.entries(paineisTab).forEach(([nome, elemento]) => {
    elemento.hidden = nome !== nomeTab;
  });
}

tabButtons.forEach((botao) => {
  botao.addEventListener("click", () => mudarTab(botao.dataset.tab));
});

function iniciarListenerSeries(db, uid) {
  seriesRef = db.collection("usuarios").doc(uid).collection("series");
  unsubscribeSeries = seriesRef.onSnapshot((snapshot) => {
    series = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    atualizarFiltro();
    renderizar();
  });
}

function pararListenerSeries() {
  if (unsubscribeSeries) unsubscribeSeries();
  seriesRef = null;
  series = [];
}

function distribuidorasDaSerie(serie) {
  if (serie.distribuidoras) return serie.distribuidoras;
  return serie.distribuidora ? [serie.distribuidora] : ["Outro"];
}

async function adicionarSerie(serie) {
  await seriesRef.add(serie);
}

async function removerSerie(id) {
  await seriesRef.doc(id).delete();
}

async function alternarStatus(id) {
  const ordem = ["quero-assistir", "assistindo", "completa"];
  const serie = series.find((s) => s.id === id);
  const proximoIndex = (ordem.indexOf(serie.status) + 1) % ordem.length;
  await seriesRef.doc(id).update({ status: ordem[proximoIndex] });
}

async function buscarSeriesTMDB(nome) {
  const url = `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(nome)}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar séries no TMDB");
  const dados = await resposta.json();
  return dados.results.slice(0, 5);
}

async function buscarDetalhesTMDB(tmdbId) {
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=watch/providers,recommendations`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar detalhes no TMDB");
  return resposta.json();
}

async function buscarStatusTMDB(tmdbId) {
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
  const resposta = await fetch(url);
  if (!resposta.ok) return null;
  return resposta.json();
}

function formatarDataTMDB(dataIso) {
  if (!dataIso) return null;
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function statusProximaTemporada(detalhes) {
  if (detalhes.status === "Canceled") {
    return { texto: "Cancelada", tipo: "cancelada" };
  }

  if (detalhes.status === "Ended") {
    return { texto: "Encerrada, sem novas temporadas", tipo: "encerrada" };
  }

  const proximo = detalhes.next_episode_to_air;
  if (proximo && proximo.episode_number === 1 && proximo.air_date) {
    return {
      texto: `Temporada ${proximo.season_number} estreia em ${formatarDataTMDB(proximo.air_date)}`,
      tipo: "confirmada",
    };
  }

  if (proximo && proximo.air_date) {
    return {
      texto: `Em exibição · próximo episódio em ${formatarDataTMDB(proximo.air_date)}`,
      tipo: "em-exibicao",
    };
  }

  if (detalhes.status === "In Production" || detalhes.status === "Planned") {
    return { texto: "Nova temporada confirmada (sem data ainda)", tipo: "sem-data" };
  }

  if (detalhes.status === "Returning Series") {
    return { texto: "Renovada, aguardando novidades", tipo: "sem-data" };
  }

  return null;
}

async function buscarTrailerTMDB(tmdbId) {
  const url = `${TMDB_BASE}/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
  const resposta = await fetch(url);
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  const videos = dados.results || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser") ||
    videos.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function distribuidorasDosDetalhes(detalhes) {
  const brasil = detalhes["watch/providers"] && detalhes["watch/providers"].results && detalhes["watch/providers"].results.BR;
  if (!brasil || !brasil.flatrate) return [];
  const nomes = brasil.flatrate.map((p) => normalizarDistribuidora(p.provider_name));
  return [...new Set(nomes)];
}

function normalizarDistribuidora(nome) {
  return nome
    .replace(/\s*(Standard|Basic|Premium)?\s*with Ads.*/i, "")
    .replace(/\s*Amazon Channel$/i, "")
    .replace(/\s*Roku Premium Channel$/i, "")
    .replace(/\s*Channel$/i, "")
    .trim();
}

function renderizarResultadosBusca(resultados) {
  if (resultados.length === 0) {
    resultadosBuscaEl.innerHTML = '<p class="vazio">Nenhum resultado encontrado.</p>';
    return;
  }

  resultadosBuscaEl.innerHTML = resultados
    .map((r, index) => {
      const ano = r.first_air_date ? r.first_air_date.slice(0, 4) : "?";
      const poster = r.poster_path
        ? `<img src="${TMDB_IMG}${r.poster_path}" alt="">`
        : `<div class="poster-vazio-grande">🎬</div>`;
      const sinopse = r.overview
        ? `<p class="resultado-sinopse">${escapeHtml(r.overview)}</p>`
        : "";

      return `
        <button type="button" class="resultado-card" data-index="${index}">
          <div class="resultado-poster-wrap">${poster}</div>
          <div class="resultado-info">
            <span class="serie-nome">${escapeHtml(r.name)}</span>
            <span class="serie-meta">${ano}${r.vote_average ? ` · ★ ${r.vote_average.toFixed(1)}` : ""}</span>
            ${sinopse}
          </div>
        </button>
      `;
    })
    .join("");

  resultadosBuscaEl.querySelectorAll(".resultado-card").forEach((botao) => {
    botao.addEventListener("click", () => selecionarResultado(resultados[Number(botao.dataset.index)]));
  });
}

async function selecionarResultado(resultado) {
  resultadosBuscaEl.innerHTML = '<p class="vazio">Carregando detalhes...</p>';
  form.hidden = true;

  const [detalhes, trailerUrl] = await Promise.all([
    buscarDetalhesTMDB(resultado.id),
    buscarTrailerTMDB(resultado.id),
  ]);
  const distribuidoras = distribuidorasDosDetalhes(detalhes);
  const recomendacoes = ((detalhes.recommendations && detalhes.recommendations.results) || []).slice(0, 6);

  serieSelecionada = {
    tmdbId: resultado.id,
    nome: resultado.name,
    poster: resultado.poster_path ? `${TMDB_IMG}${resultado.poster_path}` : null,
    backdrop: detalhes.backdrop_path ? `${TMDB_BACKDROP}${detalhes.backdrop_path}` : null,
    tagline: detalhes.tagline || "",
    sinopse: detalhes.overview || "",
    generos: (detalhes.genres || []).map((g) => g.name),
    notaTmdb: detalhes.vote_average || 0,
    temporadas: detalhes.number_of_seasons ?? null,
    episodios: detalhes.number_of_episodes ?? null,
    cancelada: detalhes.status === "Canceled",
    proximaTemporada: statusProximaTemporada(detalhes),
    trailerUrl,
    recomendacoes,
  };
  distribuidorasEditaveis = distribuidoras;

  resultadosBuscaEl.innerHTML = "";
  mostrarFormConfirmacao();
}

function renderizarRecomendacoes() {
  const secaoEl = document.getElementById("preview-recomendacoes-secao");
  const gridEl = document.getElementById("preview-recomendacoes");
  const recomendacoes = serieSelecionada.recomendacoes || [];

  if (recomendacoes.length === 0) {
    secaoEl.hidden = true;
    return;
  }

  secaoEl.hidden = false;
  gridEl.innerHTML = recomendacoes
    .map((r, index) => {
      const poster = r.poster_path
        ? `<img src="${TMDB_IMG}${r.poster_path}" alt="">`
        : `<div class="poster-vazio-grande">🎬</div>`;
      return `
        <button type="button" class="recomendacao-card" data-index="${index}">
          ${poster}
          <span class="recomendacao-nome">${escapeHtml(r.name)}</span>
        </button>
      `;
    })
    .join("");

  gridEl.querySelectorAll(".recomendacao-card").forEach((botao) => {
    botao.addEventListener("click", () => selecionarResultado(recomendacoes[Number(botao.dataset.index)]));
  });
}

function renderizarDistribuidorasEditaveis() {
  avisoSemDistribuidoraEl.hidden = true;

  document.getElementById("label-distribuidoras").textContent = souAdmin
    ? "Distribuidoras (desmarque o que estiver errado)"
    : "Distribuidoras";
  document.getElementById("campo-add-distribuidora").hidden = !souAdmin;

  if (distribuidorasEditaveis.length === 0) {
    previewDistribuidorasEl.innerHTML = souAdmin
      ? '<span class="serie-meta">Nenhuma distribuidora encontrada automaticamente. Adicione abaixo.</span>'
      : '<span class="serie-meta">Nenhuma distribuidora encontrada automaticamente.</span>';
    return;
  }

  previewDistribuidorasEl.innerHTML = distribuidorasEditaveis
    .map(
      (d, index) => `
        <span class="tag-distribuidora">
          ${escapeHtml(d)}
          ${souAdmin ? `<button type="button" class="tag-remover" data-index="${index}" title="Remover">×</button>` : ""}
        </span>
      `
    )
    .join("");

  if (!souAdmin) return;

  previewDistribuidorasEl.querySelectorAll(".tag-remover").forEach((botao) => {
    botao.addEventListener("click", () => {
      distribuidorasEditaveis.splice(Number(botao.dataset.index), 1);
      renderizarDistribuidorasEditaveis();
    });
  });
}

function textoDuracao(serie) {
  const partes = [];
  if (serie.temporadas) partes.push(`${serie.temporadas} temporada${serie.temporadas === 1 ? "" : "s"}`);
  if (serie.episodios) partes.push(`${serie.episodios} episódio${serie.episodios === 1 ? "" : "s"}`);
  return partes.join(" · ");
}

function mostrarFormConfirmacao() {
  previewNomeEl.textContent = serieSelecionada.nome;

  if (serieSelecionada.poster) {
    previewPosterEl.src = serieSelecionada.poster;
    previewPosterEl.hidden = false;
  } else {
    previewPosterEl.hidden = true;
  }

  if (serieSelecionada.backdrop) {
    previewBackdropEl.src = serieSelecionada.backdrop;
    previewBackdropEl.hidden = false;
  } else {
    previewBackdropEl.hidden = true;
  }

  previewTaglineEl.textContent = serieSelecionada.tagline;
  previewTaglineEl.hidden = !serieSelecionada.tagline;

  if (serieSelecionada.notaTmdb > 0) {
    previewNotaTmdbEl.textContent = `★ ${serieSelecionada.notaTmdb.toFixed(1)} TMDB`;
    previewNotaTmdbEl.hidden = false;
  } else {
    previewNotaTmdbEl.hidden = true;
  }

  previewGenerosEl.innerHTML = serieSelecionada.generos
    .map((g) => `<span class="tag-genero">${escapeHtml(g)}</span>`)
    .join("");

  previewSinopseEl.textContent = serieSelecionada.sinopse || "Sinopse não disponível.";

  const duracaoTexto = textoDuracao(serieSelecionada);
  previewTemporadasEl.textContent = duracaoTexto;
  previewTemporadasEl.hidden = !duracaoTexto;

  previewCanceladaEl.hidden = !serieSelecionada.cancelada;

  if (serieSelecionada.proximaTemporada) {
    previewProximaTemporadaEl.textContent = serieSelecionada.proximaTemporada.texto;
    previewProximaTemporadaEl.className = `badge ${serieSelecionada.proximaTemporada.tipo}`;
    previewProximaTemporadaEl.hidden = false;
  } else {
    previewProximaTemporadaEl.hidden = true;
  }

  if (serieSelecionada.trailerUrl) {
    previewTrailerEl.href = serieSelecionada.trailerUrl;
    previewTrailerEl.hidden = false;
  } else {
    previewTrailerEl.hidden = true;
  }

  renderizarDistribuidorasEditaveis();
  renderizarRecomendacoes();

  form.hidden = false;
}

function fecharFormConfirmacao() {
  serieSelecionada = null;
  distribuidorasEditaveis = [];
  form.hidden = true;
  form.reset();
  buscaNomeEl.value = "";
  resultadosBuscaEl.innerHTML = "";
}

function atualizarFiltro() {
  const todasDistribuidoras = new Set();
  series.forEach((s) => distribuidorasDaSerie(s).forEach((d) => todasDistribuidoras.add(d)));
  const distribuidoras = [...todasDistribuidoras].sort();
  const valorAtual = filtroEl.value;

  filtroEl.innerHTML = '<option value="todas">Todas as distribuidoras</option>';
  distribuidoras.forEach((d) => {
    const option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    filtroEl.appendChild(option);
  });

  filtroEl.value = distribuidoras.includes(valorAtual) ? valorAtual : "todas";
}

function ordenarSeries(lista) {
  const copia = [...lista];

  if (ordemSelecionada === "nota") {
    copia.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  } else if (ordemSelecionada === "alfabetica") {
    copia.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } else {
    copia.sort((a, b) => {
      const tempoA = a.criadoEm ? a.criadoEm.toMillis() : 0;
      const tempoB = b.criadoEm ? b.criadoEm.toMillis() : 0;
      return tempoB - tempoA;
    });
  }

  return copia;
}

function renderizarContinuarAssistindo() {
  const assistindo = series.filter((s) => s.status === "assistindo");

  if (assistindo.length === 0) {
    continuarSecaoEl.hidden = true;
    return;
  }

  continuarSecaoEl.hidden = false;
  continuarGridEl.innerHTML = ordenarSeries(assistindo).map(renderizarCard).join("");
}

function renderizar() {
  renderizarContinuarAssistindo();

  let seriesFiltradas =
    distribuidoraSelecionada === "todas"
      ? series
      : series.filter((s) => distribuidorasDaSerie(s).includes(distribuidoraSelecionada));

  const termoBusca = textoBuscaLista.trim().toLowerCase();
  if (termoBusca) {
    seriesFiltradas = seriesFiltradas.filter((s) => s.nome.toLowerCase().includes(termoBusca));
  }

  if (seriesFiltradas.length === 0) {
    listaEl.innerHTML = '<p class="vazio">Nenhuma série por aqui ainda.</p>';
    return;
  }

  seriesFiltradas = ordenarSeries(seriesFiltradas);

  const grupos = {};
  seriesFiltradas.forEach((s) => {
    distribuidorasDaSerie(s).forEach((distribuidora) => {
      if (!grupos[distribuidora]) grupos[distribuidora] = [];
      grupos[distribuidora].push(s);
    });
  });

  listaEl.innerHTML = Object.keys(grupos)
    .sort()
    .map((distribuidora) => `
      <div class="grupo-distribuidora">
        <div class="grupo-titulo" style="--cor-marca: ${corDistribuidora(distribuidora)}">
          <span class="grupo-titulo-texto">${escapeHtml(distribuidora)}</span>
          <span class="grupo-contagem">${grupos[distribuidora].length}</span>
        </div>
        <div class="serie-grid">
          ${grupos[distribuidora].map(renderizarCard).join("")}
        </div>
      </div>
    `)
    .join("");
}

function renderizarCard(serie) {
  const temNota = serie.nota !== null && serie.nota !== undefined && serie.nota !== "";
  const duracao = textoDuracao(serie)
    ? `<span>${textoDuracao(serie)}</span>`
    : "";
  const poster = serie.poster
    ? `<img class="serie-poster" src="${serie.poster}" alt="">`
    : `<div class="poster-vazio-grande">🎬</div>`;
  const cancelada = serie.cancelada
    ? `<span class="tag-cancelada">Cancelada</span>`
    : "";
  const proximaTemporada = serie.proximaTemporadaTexto
    ? `<span class="badge ${serie.proximaTemporadaTipo || ""}">${escapeHtml(serie.proximaTemporadaTexto)}</span>`
    : "";
  const trailer = serie.trailerUrl
    ? `<a class="icon-btn" href="${serie.trailerUrl}" target="_blank" rel="noopener" title="Assistir trailer" onclick="event.stopPropagation()">▶</a>`
    : "";

  const linhaNota = editandoNotaId === serie.id
    ? `
      <span class="editar-nota-linha">
        <input type="number" id="input-nota-${serie.id}" min="0" max="10" step="0.5" value="${serie.nota ?? ""}">
        <button type="button" onclick="salvarNota('${serie.id}')" title="Salvar">✓</button>
      </span>
    `
    : `<span>${temNota ? `⭐ ${serie.nota}` : "Sem nota"}</span>`;

  return `
    <div class="serie-card">
      <div class="serie-poster-wrap">
        ${poster}
        ${cancelada}
        <div class="serie-overlay">
          ${trailer}
          <button class="icon-btn" onclick="alternarStatus('${serie.id}')" title="Mudar status">🔁</button>
          <button class="icon-btn" onclick="iniciarEdicaoNota('${serie.id}')" title="Editar nota">✏️</button>
          <button class="icon-btn" onclick="removerSerie('${serie.id}')" title="Remover">✕</button>
        </div>
      </div>
      <div class="serie-info">
        <span class="serie-nome">${escapeHtml(serie.nome)}</span>
        <span class="serie-meta">
          <span class="badge ${serie.status}">${statusLabel[serie.status]}</span>
        </span>
        <span class="serie-meta">
          ${duracao}
        </span>
        <span class="serie-meta">
          ${linhaNota}
        </span>
        ${proximaTemporada ? `<span class="serie-meta">${proximaTemporada}</span>` : ""}
      </div>
    </div>
  `;
}

function iniciarEdicaoNota(id) {
  editandoNotaId = id;
  renderizar();
}

async function salvarNota(id) {
  const input = document.getElementById(`input-nota-${id}`);
  const valor = input.value === "" ? null : Number(input.value);
  editandoNotaId = null;
  await seriesRef.doc(id).update({ nota: valor });
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

btnBuscarEl.addEventListener("click", async () => {
  const nome = buscaNomeEl.value.trim();
  if (!nome) return;

  if (!TMDB_API_KEY) {
    resultadosBuscaEl.innerHTML =
      '<p class="vazio">Configure sua chave do TMDB em config.js para buscar automaticamente.</p>';
    return;
  }

  resultadosBuscaEl.innerHTML = '<p class="vazio">Buscando...</p>';
  form.hidden = true;

  try {
    const resultados = await buscarSeriesTMDB(nome);
    renderizarResultadosBusca(resultados);
  } catch (erro) {
    resultadosBuscaEl.innerHTML = '<p class="vazio">Erro ao buscar. Tente novamente.</p>';
  }
});

buscaNomeEl.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    btnBuscarEl.click();
  }
});

btnAddDistribuidoraEl.addEventListener("click", () => {
  const valor = distribuidoraManualEl.value;
  if (!distribuidorasEditaveis.includes(valor)) {
    distribuidorasEditaveis.push(valor);
    renderizarDistribuidorasEditaveis();
  }
});

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!serieSelecionada) return;

  if (distribuidorasEditaveis.length === 0) {
    avisoSemDistribuidoraEl.hidden = false;
    return;
  }

  const status = document.getElementById("status").value;
  const notaInput = document.getElementById("nota").value;
  const nota = notaInput === "" ? null : Number(notaInput);

  await adicionarSerie({
    nome: serieSelecionada.nome,
    poster: serieSelecionada.poster,
    tmdbId: serieSelecionada.tmdbId,
    temporadas: serieSelecionada.temporadas,
    episodios: serieSelecionada.episodios,
    cancelada: serieSelecionada.cancelada,
    trailerUrl: serieSelecionada.trailerUrl || null,
    proximaTemporadaTexto: serieSelecionada.proximaTemporada ? serieSelecionada.proximaTemporada.texto : null,
    proximaTemporadaTipo: serieSelecionada.proximaTemporada ? serieSelecionada.proximaTemporada.tipo : null,
    distribuidoras: [...distribuidorasEditaveis],
    status,
    nota,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });

  fecharFormConfirmacao();
  mudarTab("lista");
});

filtroEl.addEventListener("change", (evento) => {
  distribuidoraSelecionada = evento.target.value;
  renderizar();
});

buscaListaEl.addEventListener("input", (evento) => {
  textoBuscaLista = evento.target.value;
  renderizar();
});

ordenarListaEl.addEventListener("change", (evento) => {
  ordemSelecionada = evento.target.value;
  renderizar();
});

async function resolverTmdbId(serie) {
  if (serie.tmdbId) return serie.tmdbId;
  try {
    const resultados = await buscarSeriesTMDB(serie.nome);
    return resultados[0] ? resultados[0].id : null;
  } catch (erro) {
    return null;
  }
}

btnAtualizarTemporadasEl.addEventListener("click", async () => {
  btnAtualizarTemporadasEl.disabled = true;
  statusAtualizarTemporadasEl.hidden = false;
  statusAtualizarTemporadasEl.textContent = `Verificando 0 de ${series.length}...`;

  let verificadas = 0;
  let falhas = 0;

  await Promise.allSettled(
    series.map(async (serie) => {
      const tmdbId = await resolverTmdbId(serie);
      if (!tmdbId) {
        falhas += 1;
        return;
      }

      const detalhes = await buscarStatusTMDB(tmdbId);
      if (!detalhes) {
        falhas += 1;
        return;
      }

      const proximaTemporada = statusProximaTemporada(detalhes);
      await seriesRef.doc(serie.id).update({
        tmdbId,
        cancelada: detalhes.status === "Canceled",
        proximaTemporadaTexto: proximaTemporada ? proximaTemporada.texto : null,
        proximaTemporadaTipo: proximaTemporada ? proximaTemporada.tipo : null,
      });

      verificadas += 1;
      statusAtualizarTemporadasEl.textContent = `Verificando ${verificadas + falhas} de ${series.length}...`;
    })
  );

  statusAtualizarTemporadasEl.textContent = falhas > 0
    ? `Atualizado! ${verificadas} série(s) verificadas, ${falhas} não encontrada(s).`
    : `Atualizado! ${verificadas} série(s) verificadas.`;
  btnAtualizarTemporadasEl.disabled = false;
});
