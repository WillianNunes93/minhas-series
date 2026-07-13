const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

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
let serieSelecionada = null;
let distribuidorasEditaveis = [];

const buscaNomeEl = document.getElementById("busca-nome");
const btnBuscarEl = document.getElementById("btn-buscar");
const resultadosBuscaEl = document.getElementById("resultados-busca");

const form = document.getElementById("form-serie");
const previewPosterEl = document.getElementById("preview-poster");
const previewNomeEl = document.getElementById("preview-nome");
const previewDistribuidorasEl = document.getElementById("preview-distribuidoras");
const previewTemporadasEl = document.getElementById("preview-temporadas");
const previewCanceladaEl = document.getElementById("preview-cancelada");
const avisoSemDistribuidoraEl = document.getElementById("aviso-sem-distribuidora");
const distribuidoraManualEl = document.getElementById("distribuidora-manual");
const btnAddDistribuidoraEl = document.getElementById("btn-add-distribuidora");

const listaEl = document.getElementById("lista-series");
const filtroEl = document.getElementById("filtro-distribuidora");

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
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=watch/providers`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar detalhes no TMDB");
  return resposta.json();
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
        : `<div class="poster-vazio">?</div>`;
      return `
        <button type="button" class="resultado-item" data-index="${index}">
          ${poster}
          <span>${escapeHtml(r.name)} <span class="serie-meta">(${ano})</span></span>
        </button>
      `;
    })
    .join("");

  resultadosBuscaEl.querySelectorAll(".resultado-item").forEach((botao) => {
    botao.addEventListener("click", () => selecionarResultado(resultados[Number(botao.dataset.index)]));
  });
}

async function selecionarResultado(resultado) {
  resultadosBuscaEl.innerHTML = '<p class="vazio">Carregando detalhes...</p>';

  const detalhes = await buscarDetalhesTMDB(resultado.id);
  const distribuidoras = distribuidorasDosDetalhes(detalhes);

  serieSelecionada = {
    tmdbId: resultado.id,
    nome: resultado.name,
    poster: resultado.poster_path ? `${TMDB_IMG}${resultado.poster_path}` : null,
    temporadas: detalhes.number_of_seasons ?? null,
    episodios: detalhes.number_of_episodes ?? null,
    cancelada: detalhes.status === "Canceled",
  };
  distribuidorasEditaveis = distribuidoras;

  resultadosBuscaEl.innerHTML = "";
  mostrarFormConfirmacao();
}

function renderizarDistribuidorasEditaveis() {
  avisoSemDistribuidoraEl.hidden = true;

  previewDistribuidorasEl.innerHTML = distribuidorasEditaveis.length
    ? distribuidorasEditaveis
        .map(
          (d, index) => `
            <span class="tag-distribuidora">
              ${escapeHtml(d)}
              <button type="button" class="tag-remover" data-index="${index}" title="Remover">×</button>
            </span>
          `
        )
        .join("")
    : '<span class="serie-meta">Nenhuma distribuidora encontrada automaticamente. Adicione abaixo.</span>';

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

  const duracaoTexto = textoDuracao(serieSelecionada);
  previewTemporadasEl.textContent = duracaoTexto;
  previewTemporadasEl.hidden = !duracaoTexto;

  previewCanceladaEl.hidden = !serieSelecionada.cancelada;

  renderizarDistribuidorasEditaveis();

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

function renderizar() {
  const seriesFiltradas =
    distribuidoraSelecionada === "todas"
      ? series
      : series.filter((s) => distribuidorasDaSerie(s).includes(distribuidoraSelecionada));

  if (seriesFiltradas.length === 0) {
    listaEl.innerHTML = '<p class="vazio">Nenhuma série por aqui ainda.</p>';
    return;
  }

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
  const nota = serie.nota !== null && serie.nota !== undefined && serie.nota !== ""
    ? `<span>⭐ ${serie.nota}</span>`
    : "";
  const duracao = textoDuracao(serie)
    ? `<span>${textoDuracao(serie)}</span>`
    : "";
  const poster = serie.poster
    ? `<img class="serie-poster" src="${serie.poster}" alt="">`
    : `<div class="poster-vazio-grande">🎬</div>`;
  const cancelada = serie.cancelada
    ? `<span class="tag-cancelada">Cancelada</span>`
    : "";

  return `
    <div class="serie-card">
      <div class="serie-poster-wrap">
        ${poster}
        ${cancelada}
        <div class="serie-overlay">
          <button class="icon-btn" onclick="alternarStatus('${serie.id}')" title="Mudar status">🔁</button>
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
          ${nota}
        </span>
      </div>
    </div>
  `;
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
    temporadas: serieSelecionada.temporadas,
    episodios: serieSelecionada.episodios,
    cancelada: serieSelecionada.cancelada,
    distribuidoras: [...distribuidorasEditaveis],
    status,
    nota,
  });

  fecharFormConfirmacao();
});

filtroEl.addEventListener("change", (evento) => {
  distribuidoraSelecionada = evento.target.value;
  renderizar();
});
