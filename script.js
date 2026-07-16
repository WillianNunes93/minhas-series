const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";
const TMDB_LOGO = "https://image.tmdb.org/t/p/w92";

const statusLabel = {
  "quero-assistir": "Quero assistir",
  "assistindo": "Assistindo",
  "pausada": "Pausada",
  "completa": "Concluída",
  "abandonada": "Abandonada",
};

let series = [];
let seriesRef = null;
let unsubscribeSeries = null;
let notificacoes = [];
let notificacoesRef = null;
let unsubscribeNotificacoes = null;
let atividades = [];
let atividadesRef = null;
let unsubscribeAtividades = null;
let seriesCarregadas = false;
let distribuidoraSelecionada = "todas";
let textoBuscaLista = "";
let ordemSelecionada = "recentes";
let editandoNotaId = null;
let serieSelecionada = null;
let distribuidorasEditaveis = [];

const buscaNomeEl = document.getElementById("busca-nome");
const btnBuscarEl = document.getElementById("btn-buscar");
const resultadosBuscaEl = document.getElementById("resultados-busca");
const resultadosTituloEl = document.getElementById("resultados-titulo");

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
const btnNotificacoesEl = document.getElementById("btn-notificacoes");
const badgeNotificacoesEl = document.getElementById("badge-notificacoes");
const painelNotificacoesEl = document.getElementById("painel-notificacoes");
const listaNotificacoesEl = document.getElementById("lista-notificacoes");

const tabButtons = document.querySelectorAll(".tab-btn");
const paineisTab = {
  dashboard: document.getElementById("painel-dashboard"),
  consultar: document.getElementById("painel-consultar"),
  lista: document.getElementById("painel-lista"),
  timeline: document.getElementById("painel-timeline"),
  estatisticas: document.getElementById("painel-estatisticas"),
  amigos: document.getElementById("painel-amigos"),
  discovery: document.getElementById("painel-discovery"),
};

function mudarTab(nomeTab) {
  tabButtons.forEach((botao) => botao.classList.toggle("ativa", botao.dataset.tab === nomeTab));
  Object.entries(paineisTab).forEach(([nome, elemento]) => {
    elemento.hidden = nome !== nomeTab;
  });
}

const sidebarEl = document.getElementById("sidebar");
const sidebarOverlayEl = document.getElementById("sidebar-overlay");
const btnMenuMobileEl = document.getElementById("btn-menu-mobile");

function abrirSidebar() {
  sidebarEl.classList.add("aberta");
  sidebarOverlayEl.hidden = false;
}

function fecharSidebar() {
  sidebarEl.classList.remove("aberta");
  sidebarOverlayEl.hidden = true;
}

btnMenuMobileEl.addEventListener("click", () => {
  if (sidebarEl.classList.contains("aberta")) fecharSidebar();
  else abrirSidebar();
});

sidebarOverlayEl.addEventListener("click", fecharSidebar);

tabButtons.forEach((botao) => {
  botao.addEventListener("click", () => {
    mudarTab(botao.dataset.tab);
    fecharSidebar();
  });
});

function iniciarListenerSeries(db, uid) {
  seriesRef = db.collection("usuarios").doc(uid).collection("series");
  unsubscribeSeries = seriesRef.onSnapshot((snapshot) => {
    series = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    seriesCarregadas = true;
    atualizarFiltro();
    renderizar();
    renderizarDashboard();
    TodayOverview();
    TimelinePage();
    atualizarModalEpisodios();
    EstatisticasPage();
  });
}

function pararListenerSeries() {
  if (unsubscribeSeries) unsubscribeSeries();
  seriesRef = null;
  series = [];
  seriesCarregadas = false;
}

function iniciarListenerAtividades(db, uid) {
  atividadesRef = db.collection("usuarios").doc(uid).collection("atividades");
  unsubscribeAtividades = atividadesRef
    .orderBy("criadoEm", "desc")
    .limit(10)
    .onSnapshot((snapshot) => {
      atividades = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderizarDashboard();
    });
}

function pararListenerAtividades() {
  if (unsubscribeAtividades) unsubscribeAtividades();
  atividadesRef = null;
  atividades = [];
}

async function registrarAtividade(tipo, serieNome, descricao) {
  if (!atividadesRef) return;
  await atividadesRef.add({
    tipo,
    serieNome,
    descricao,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function iniciarListenerNotificacoes(db, uid) {
  notificacoesRef = db.collection("usuarios").doc(uid).collection("notificacoes");
  unsubscribeNotificacoes = notificacoesRef
    .orderBy("criadoEm", "desc")
    .limit(30)
    .onSnapshot((snapshot) => {
      notificacoes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderizarNotificacoes();
    });
}

function pararListenerNotificacoes() {
  if (unsubscribeNotificacoes) unsubscribeNotificacoes();
  notificacoesRef = null;
  notificacoes = [];
}

async function criarNotificacao(mensagem) {
  await notificacoesRef.add({
    mensagem,
    lida: false,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function renderizarNotificacoes() {
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  badgeNotificacoesEl.hidden = naoLidas === 0;
  badgeNotificacoesEl.textContent = naoLidas;

  if (notificacoes.length === 0) {
    listaNotificacoesEl.innerHTML = '<p class="vazio">Nenhuma notificação ainda.</p>';
    return;
  }

  listaNotificacoesEl.innerHTML = notificacoes
    .map(
      (n) => `
        <div class="notificacao-item ${n.lida ? "" : "nao-lida"}">
          <span>${escapeHtml(n.mensagem)}</span>
          <span class="notificacao-data">${n.criadoEm ? n.criadoEm.toDate().toLocaleDateString("pt-BR") : "agora"}</span>
        </div>
      `
    )
    .join("");
}

async function marcarNotificacoesComoLidas() {
  const naoLidas = notificacoes.filter((n) => !n.lida);
  await Promise.all(naoLidas.map((n) => notificacoesRef.doc(n.id).update({ lida: true })));
}

function distribuidorasDaSerie(serie) {
  if (serie.distribuidoras) return serie.distribuidoras;
  return serie.distribuidora ? [serie.distribuidora] : ["Outro"];
}

// Fallback para quando não temos o logo oficial (distribuidora adicionada
// manualmente, ou série salva antes desta funcionalidade existir): um
// selo colorido com a sigla do serviço, sem depender de nenhuma imagem.
const SELOS_DISTRIBUIDORA = [
  { padrao: /netflix/i, sigla: "N", cor: "#e50914" },
  { padrao: /prime ?video|amazon/i, sigla: "P", cor: "#00a8e1" },
  { padrao: /disney/i, sigla: "D+", cor: "#113ccf" },
  { padrao: /max|hbo/i, sigla: "M", cor: "#002be7" },
  { padrao: /apple/i, sigla: "TV", cor: "#333333" },
  { padrao: /paramount/i, sigla: "P+", cor: "#0064ff" },
  { padrao: /globoplay|globo/i, sigla: "G", cor: "#e60034" },
  { padrao: /star\+?/i, sigla: "S+", cor: "#0d0d0d" },
];

function seloDistribuidoraFallback(nome) {
  const encontrado = SELOS_DISTRIBUIDORA.find((s) => s.padrao.test(nome));
  const sigla = encontrado ? encontrado.sigla : nome.slice(0, 1).toUpperCase();
  const cor = encontrado ? encontrado.cor : "#5b5f73";
  return `<span class="selo-distribuidora" style="background:${cor}" title="${escapeHtml(nome)}">${sigla}</span>`;
}

function seloDistribuidora(nome, logoUrl) {
  if (logoUrl) {
    return `<img class="selo-distribuidora-logo" src="${logoUrl}" alt="${escapeHtml(nome)}" title="${escapeHtml(nome)}">`;
  }
  return seloDistribuidoraFallback(nome);
}

function renderizarSelosDistribuidoras(serie) {
  const nomes = distribuidorasDaSerie(serie);
  if (nomes.length === 0) return "";
  const logos = serie.distribuidorasLogos || {};
  return `<div class="distribuidoras-selo-linha">${nomes.map((nome) => seloDistribuidora(nome, logos[nome])).join("")}</div>`;
}

async function adicionarSerie(serie) {
  await seriesRef.add({ ...serie, progressUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await registrarAtividade("adicionada", serie.nome, "Série adicionada à lista");
}

async function removerSerie(id) {
  const serie = series.find((s) => s.id === id);
  await seriesRef.doc(id).delete();
  if (serie) await registrarAtividade("removida", serie.nome, "Série removida da lista");
}

async function alternarFavorita(id) {
  const serie = series.find((s) => s.id === id);
  if (!serie) return;
  await seriesRef.doc(id).update({ favorita: !serie.favorita });
}

async function mudarStatus(id, novoStatus) {
  const serie = series.find((s) => s.id === id);
  const atualizacao = { status: novoStatus };
  if (novoStatus === "assistindo") {
    atualizacao.progressUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  await seriesRef.doc(id).update(atualizacao);
  if (serie) {
    await registrarAtividade(
      "status-alterado",
      serie.nome,
      `Status alterado para ${statusLabel[novoStatus]}`
    );
  }
}

async function alternarTemporadaAssistida(id, numeroTemporada) {
  const serie = series.find((s) => s.id === id);
  const atuais = serie.temporadasAssistidas || [];
  const marcandoComoAssistida = !atuais.includes(numeroTemporada);
  const novas = marcandoComoAssistida
    ? [...atuais, numeroTemporada].sort((a, b) => a - b)
    : atuais.filter((n) => n !== numeroTemporada);

  const atualizacao = { temporadasAssistidas: novas };
  if (marcandoComoAssistida) {
    atualizacao.progressUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  await seriesRef.doc(id).update(atualizacao);

  if (marcandoComoAssistida) {
    await registrarAtividade("temporada-concluida", serie.nome, `Temporada ${numeroTemporada} concluída`);
  }
}

async function buscarSeriesTMDB(nome) {
  const url = `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(nome)}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar séries no TMDB");
  const dados = await resposta.json();
  return dados.results.slice(0, 5);
}

async function buscarTrendingTMDB() {
  const url = `${TMDB_BASE}/trending/tv/week?api_key=${TMDB_API_KEY}&language=pt-BR`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar séries em alta no TMDB");
  const dados = await resposta.json();
  return dados.results.slice(0, 10);
}

// Mostra séries em alta assim que a aba Consultar carrega, em vez de uma
// tela em branco até o usuário digitar algo. Silencioso em caso de falha:
// a busca manual continua funcionando normalmente.
async function mostrarSugestoesIniciais() {
  if (!TMDB_API_KEY) return;
  try {
    const resultados = await buscarTrendingTMDB();
    resultadosTituloEl.hidden = false;
    renderizarResultadosBusca(resultados);
  } catch (erro) {
    // Sem sugestão inicial não impede a busca manual — segue sem nada.
  }
}

async function buscarDetalhesTMDB(tmdbId) {
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=watch/providers,recommendations`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar detalhes no TMDB");
  return resposta.json();
}

async function buscarStatusTMDB(tmdbId) {
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=watch/providers`;
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
    return { texto: "Cancelada", tipo: "cancelada", data: null, temporada: null };
  }

  if (detalhes.status === "Ended") {
    return { texto: "Encerrada, sem novas temporadas", tipo: "encerrada", data: null, temporada: null };
  }

  const proximo = detalhes.next_episode_to_air;
  if (proximo && proximo.episode_number === 1 && proximo.air_date) {
    return {
      texto: `Temporada ${proximo.season_number} estreia em ${formatarDataTMDB(proximo.air_date)}`,
      tipo: "confirmada",
      data: proximo.air_date,
      temporada: proximo.season_number,
    };
  }

  if (proximo && proximo.air_date) {
    return {
      texto: `Em exibição · próximo episódio em ${formatarDataTMDB(proximo.air_date)}`,
      tipo: "em-exibicao",
      data: proximo.air_date,
      temporada: proximo.season_number,
    };
  }

  if (detalhes.status === "In Production" || detalhes.status === "Planned") {
    return { texto: "Nova temporada confirmada (sem data ainda)", tipo: "sem-data", data: null, temporada: null };
  }

  if (detalhes.status === "Returning Series") {
    return { texto: "Renovada, aguardando novidades", tipo: "sem-data", data: null, temporada: null };
  }

  return null;
}

const LIMIARES_AVISO_DIAS = [30, 15, 7, 1];

function diasAte(dataIso) {
  if (!dataIso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataIso}T00:00:00`);
  return Math.round((alvo - hoje) / (1000 * 60 * 60 * 24));
}

async function calcularAvisosDeData(serie, dataAlvo, avisosBase) {
  if (!dataAlvo) return [];

  const dias = diasAte(dataAlvo);
  if (dias === null || dias < 0) return avisosBase;

  const devidos = LIMIARES_AVISO_DIAS.filter((limite) => dias <= limite && !avisosBase.includes(limite));
  if (devidos.length === 0) return avisosBase;

  const rotuloDias = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
  await criarNotificacao(`${serie.nome}: lançamento ${rotuloDias} (${formatarDataTMDB(dataAlvo)})`);

  return [...avisosBase, ...devidos];
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

// Logos oficiais das distribuidoras, direto do TMDB (mesmo CDN já usado
// para pôsteres/backdrops) — evita baixar/hospedar arquivos de marca
// registrada no próprio repositório.
function logosDistribuidorasDosDetalhes(detalhes) {
  const brasil = detalhes["watch/providers"] && detalhes["watch/providers"].results && detalhes["watch/providers"].results.BR;
  if (!brasil || !brasil.flatrate) return {};

  const logos = {};
  brasil.flatrate.forEach((p) => {
    const nome = normalizarDistribuidora(p.provider_name);
    if (p.logo_path && !logos[nome]) {
      logos[nome] = `${TMDB_LOGO}${p.logo_path}`;
    }
  });
  return logos;
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
  resultadosTituloEl.hidden = true;
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
    distribuidorasLogos: logosDistribuidorasDosDetalhes(detalhes),
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
  mostrarSugestoesIniciais();
}

function atualizarFiltro() {
  const todasDistribuidoras = new Set();
  series.forEach((s) => distribuidorasDaSerie(s).forEach((d) => todasDistribuidoras.add(d)));
  const distribuidoras = [...todasDistribuidoras].sort();
  const valorAtual = filtroEl.value;

  filtroEl.innerHTML = '<option value="todas">Todas as distribuidoras</option>';

  const favoritas = (typeof perfilUsuario !== "undefined" && perfilUsuario && perfilUsuario.distribuidorasFavoritas) || [];
  if (favoritas.length > 0) {
    const opcaoFavoritas = document.createElement("option");
    opcaoFavoritas.value = "favoritas";
    opcaoFavoritas.textContent = "⭐ Minhas distribuidoras";
    filtroEl.appendChild(opcaoFavoritas);
  }

  distribuidoras.forEach((d) => {
    const option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    filtroEl.appendChild(option);
  });

  filtroEl.value = distribuidoras.includes(valorAtual) || valorAtual === "favoritas" ? valorAtual : "todas";
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

function seriesFiltradasPorFavoritas() {
  const favoritas = (perfilUsuario && perfilUsuario.distribuidorasFavoritas) || [];
  return series.filter((s) => distribuidorasDaSerie(s).some((d) => favoritas.includes(d)));
}

function renderizar() {
  renderizarContinuarAssistindo();

  let seriesFiltradas;
  if (distribuidoraSelecionada === "todas") {
    seriesFiltradas = series;
  } else if (distribuidoraSelecionada === "favoritas") {
    seriesFiltradas = seriesFiltradasPorFavoritas();
  } else {
    seriesFiltradas = series.filter((s) => distribuidorasDaSerie(s).includes(distribuidoraSelecionada));
  }

  const termoBusca = textoBuscaLista.trim().toLowerCase();
  if (termoBusca) {
    seriesFiltradas = seriesFiltradas.filter((s) => s.nome.toLowerCase().includes(termoBusca));
  }

  if (seriesFiltradas.length === 0) {
    listaEl.innerHTML = '<p class="vazio">Nenhuma série por aqui ainda.</p>';
    return;
  }

  seriesFiltradas = ordenarSeries(seriesFiltradas);

  listaEl.innerHTML = `<div class="serie-grid">${seriesFiltradas.map(renderizarCard).join("")}</div>`;
}

const ROTULOS_SEM_CONTAGEM = {
  cancelada: "Cancelada",
  encerrada: "Encerrada",
  "sem-data": "Sem data",
};

const ROTULOS_CONTADOR = {
  confirmada: "Estreia",
  "em-exibicao": "Próx. episódio",
  "sem-data": "Renovação",
  encerrada: "Status",
  cancelada: "Status",
};

function renderizarContadorTemporada(serie) {
  const tipo = serie.proximaTemporadaTipo;
  if (!tipo) return "";

  const rotulo = ROTULOS_CONTADOR[tipo] || "Status";

  if (ROTULOS_SEM_CONTAGEM[tipo]) {
    return `
      <span class="contador-wrap">
        <span class="contador-label">${rotulo}</span>
        <span class="badge contador-temporada ${tipo}">${ROTULOS_SEM_CONTAGEM[tipo]}</span>
      </span>
    `;
  }

  const dias = diasAte(serie.proximaTemporadaData);
  if (dias === null) return "";

  const texto = dias < 0 ? "Lançado" : dias === 0 ? "Hoje" : dias === 1 ? "1 dia" : `${dias} dias`;
  return `
    <span class="contador-wrap">
      <span class="contador-label">${rotulo}</span>
      <span class="badge contador-temporada ${tipo}" title="${escapeHtml(serie.proximaTemporadaTexto || "")}">${texto}</span>
    </span>
  `;
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
  const contadorTemporada = renderizarContadorTemporada(serie);
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

  const seletorStatus = `
    <select class="select-status status-${serie.status}" onchange="mudarStatus('${serie.id}', this.value)" onclick="event.stopPropagation()">
      ${Object.entries(statusLabel)
        .map(([valor, rotulo]) => `<option value="${valor}" ${serie.status === valor ? "selected" : ""}>${rotulo}</option>`)
        .join("")}
    </select>
  `;

  const pillsTemporadas = renderizarPillsTemporadas(serie);
  const btnEpisodios = serie.temporadas
    ? `<button type="button" class="btn-episodios" onclick="event.stopPropagation(); abrirModalEpisodios('${serie.id}')">📺 Episódios</button>`
    : "";

  return `
    <div class="serie-card">
      <div class="serie-poster-wrap">
        ${poster}
        ${cancelada}
        ${serie.favorita ? '<span class="tag-favorita">★</span>' : ""}
        <div class="serie-overlay">
          <button class="icon-btn ${serie.favorita ? "favorita-ativa" : ""}" onclick="event.stopPropagation(); alternarFavorita('${serie.id}')" title="${serie.favorita ? "Remover dos favoritos" : "Marcar como favorita"}">${serie.favorita ? "★" : "☆"}</button>
          ${trailer}
          ${serie.tmdbId ? `<button class="icon-btn" onclick="event.stopPropagation(); abrirModalIndicar('${serie.id}')" title="Indicar para um amigo">🎁</button>` : ""}
          <button class="icon-btn" onclick="iniciarEdicaoNota('${serie.id}')" title="Editar nota">✏️</button>
          <button class="icon-btn" onclick="removerSerie('${serie.id}')" title="Remover">✕</button>
        </div>
      </div>
      <div class="serie-info">
        <div class="serie-cabecalho">
          <span class="serie-nome">${escapeHtml(serie.nome)}</span>
          ${contadorTemporada}
        </div>
        ${renderizarSelosDistribuidoras(serie)}
        <span class="serie-meta">
          ${seletorStatus}
        </span>
        <span class="serie-meta">
          ${duracao}
        </span>
        <span class="serie-meta">
          ${linhaNota}
        </span>
        ${pillsTemporadas}
        ${btnEpisodios}
      </div>
    </div>
  `;
}

function renderizarPillsTemporadas(serie) {
  if (!serie.temporadas) return "";

  const assistidas = serie.temporadasAssistidas || [];
  const pills = [];
  for (let numero = 1; numero <= serie.temporadas; numero += 1) {
    const marcada = assistidas.includes(numero);
    pills.push(`
      <button
        type="button"
        class="pill-temporada ${marcada ? "marcada" : ""}"
        onclick="event.stopPropagation(); alternarTemporadaAssistida('${serie.id}', ${numero})"
        title="Temporada ${numero}${marcada ? " (assistida)" : ""}"
      >${numero}</button>
    `);
  }

  return `<div class="temporadas-pills" title="Marque as temporadas já assistidas">${pills.join("")}</div>`;
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

  resultadosTituloEl.hidden = true;

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

  const proximaTemporadaData = serieSelecionada.proximaTemporada ? serieSelecionada.proximaTemporada.data : null;
  const avisosIniciais = await calcularAvisosDeData({ nome: serieSelecionada.nome }, proximaTemporadaData, []);

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
    proximaTemporadaData,
    proximaTemporadaNumero: serieSelecionada.proximaTemporada ? serieSelecionada.proximaTemporada.temporada : null,
    proximaTemporadaAvisosDados: avisosIniciais,
    distribuidoras: [...distribuidorasEditaveis],
    distribuidorasLogos: serieSelecionada.distribuidorasLogos || {},
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

async function verificarRenovacoes({ silencioso } = {}) {
  if (!silencioso) {
    btnAtualizarTemporadasEl.disabled = true;
    statusAtualizarTemporadasEl.hidden = false;
    statusAtualizarTemporadasEl.textContent = `Verificando 0 de ${series.length}...`;
  }

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
      const textoNovo = proximaTemporada ? proximaTemporada.texto : null;
      const tipoNovo = proximaTemporada ? proximaTemporada.tipo : null;
      const dataNova = proximaTemporada ? proximaTemporada.data : null;
      const numeroNovo = proximaTemporada ? proximaTemporada.temporada : null;

      const jaTinhaInformacao = serie.proximaTemporadaTexto !== undefined && serie.proximaTemporadaTexto !== null;
      if (jaTinhaInformacao && textoNovo !== serie.proximaTemporadaTexto) {
        await criarNotificacao(`${serie.nome}: ${textoNovo || "status de renovação atualizado"}`);
      }

      const dataAnterior = serie.proximaTemporadaData || null;
      const avisosBase = dataNova !== dataAnterior ? [] : (serie.proximaTemporadaAvisosDados || []);
      const avisosAtualizados = await calcularAvisosDeData(serie, dataNova, avisosBase);

      await seriesRef.doc(serie.id).update({
        tmdbId,
        cancelada: detalhes.status === "Canceled",
        proximaTemporadaTexto: textoNovo,
        proximaTemporadaTipo: tipoNovo,
        proximaTemporadaData: dataNova,
        proximaTemporadaNumero: numeroNovo,
        proximaTemporadaAvisosDados: avisosAtualizados,
        distribuidorasLogos: { ...(serie.distribuidorasLogos || {}), ...logosDistribuidorasDosDetalhes(detalhes) },
      });

      verificadas += 1;
      if (!silencioso) {
        statusAtualizarTemporadasEl.textContent = `Verificando ${verificadas + falhas} de ${series.length}...`;
      }
    })
  );

  if (!silencioso) {
    statusAtualizarTemporadasEl.textContent = falhas > 0
      ? `Atualizado! ${verificadas} série(s) verificadas, ${falhas} não encontrada(s).`
      : `Atualizado! ${verificadas} série(s) verificadas.`;
    btnAtualizarTemporadasEl.disabled = false;
  }
}

function deveVerificarRenovacoesHoje() {
  const hoje = new Date().toISOString().slice(0, 10);
  return localStorage.getItem("ultimaVerificacaoTemporadas") !== hoje;
}

function marcarRenovacoesVerificadasHoje() {
  const hoje = new Date().toISOString().slice(0, 10);
  localStorage.setItem("ultimaVerificacaoTemporadas", hoje);
}

async function verificarRenovacoesAutomaticamente() {
  if (!deveVerificarRenovacoesHoje()) return;
  await verificarRenovacoes({ silencioso: true });
  marcarRenovacoesVerificadasHoje();
}

btnAtualizarTemporadasEl.addEventListener("click", () => verificarRenovacoes({ silencioso: false }));

btnNotificacoesEl.addEventListener("click", (evento) => {
  evento.stopPropagation();
  painelNotificacoesEl.hidden = !painelNotificacoesEl.hidden;
  if (!painelNotificacoesEl.hidden) marcarNotificacoesComoLidas();
});

document.addEventListener("click", (evento) => {
  if (!painelNotificacoesEl.hidden && !evento.target.closest(".notificacoes-wrap")) {
    painelNotificacoesEl.hidden = true;
  }
});

mostrarSugestoesIniciais();
