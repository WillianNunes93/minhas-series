const discoveryDistribuidorasEl = document.getElementById("discovery-distribuidoras");
const discoveryMesEl = document.getElementById("discovery-mes");
const discoveryCategoriaEl = document.getElementById("discovery-categoria");
const discoveryOrdenarEl = document.getElementById("discovery-ordenar");
const discoveryResultadosEl = document.getElementById("discovery-resultados");

const MESES_LIMITE_DISCOVERY = 6;

let discoveryProvedores = null;
let discoveryDistribuidoraSelecionada = null;
let discoveryMesSelecionado = null;
let discoveryCategoriaSelecionada = "todas";
let discoveryOrdenacao = "data";
let discoveryResultadosAtuais = [];

async function carregarCategoriasDiscovery() {
  const url = `${TMDB_BASE}/genre/tv/list?api_key=${TMDB_API_KEY}&language=pt-BR`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar categorias");
  const dados = await resposta.json();
  const generos = dados.genres || [];

  discoveryCategoriaEl.innerHTML = [
    '<option value="todas">Todas as categorias</option>',
    ...generos.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`),
  ].join("");
}

// Reaproveita os padrões de SELOS_DISTRIBUIDORA (script.js) para casar o
// nome usado no app com o provedor real do TMDB e pegar o logo oficial.
async function carregarProvedoresDiscovery() {
  const url = `${TMDB_BASE}/watch/providers/tv?api_key=${TMDB_API_KEY}&language=pt-BR&watch_region=BR`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar distribuidoras");
  const dados = await resposta.json();
  const provedoresTMDB = dados.results || [];

  discoveryProvedores = SELOS_DISTRIBUIDORA.map((selo) => {
    const encontrado = provedoresTMDB.find((p) => selo.padrao.test(p.provider_name));
    if (!encontrado) return null;
    return {
      nome: normalizarDistribuidora(encontrado.provider_name),
      id: encontrado.provider_id,
      logo: encontrado.logo_path ? `${TMDB_LOGO}${encontrado.logo_path}` : null,
      sigla: selo.sigla,
      cor: selo.cor,
    };
  }).filter(Boolean);
}

function gerarOpcoesMesesDiscovery() {
  const opcoes = [];
  const agora = new Date();
  for (let i = 0; i < MESES_LIMITE_DISCOVERY; i += 1) {
    const data = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    opcoes.push({ ano: data.getFullYear(), mes: data.getMonth() + 1 });
  }
  return opcoes;
}

function renderizarSelectMesesDiscovery() {
  const opcoes = gerarOpcoesMesesDiscovery();
  discoveryMesEl.innerHTML = opcoes
    .map(
      (o, index) => `
        <option value="${o.ano}-${o.mes}" ${index === 0 ? "selected" : ""}>${MESES_COMPLETOS_PT[o.mes - 1]} ${o.ano}</option>
      `
    )
    .join("");
  discoveryMesSelecionado = opcoes[0];
}

function DistribuidoraOpcaoDiscovery(p) {
  const logoHtml = p.logo
    ? `<img src="${p.logo}" alt="" class="discovery-distribuidora-logo">`
    : `<span class="selo-distribuidora" style="background:${p.cor}">${p.sigla}</span>`;
  const ativa = discoveryDistribuidoraSelecionada === p.id;
  return `
    <button type="button" class="discovery-distribuidora-opcao ${ativa ? "ativa" : ""}" data-provider-id="${p.id}">
      ${logoHtml}
      <span>${escapeHtml(p.nome)}</span>
    </button>
  `;
}

function renderizarDistribuidorasDiscovery() {
  discoveryDistribuidorasEl.innerHTML = discoveryProvedores.map(DistribuidoraOpcaoDiscovery).join("");
}

function ultimoDiaDoMesISO(ano, mes) {
  const data = new Date(ano, mes, 0);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

// O discover/tv com air_date.gte/lte encontra séries com algum episódio no
// mês, mas só devolve first_air_date (estreia da série, não do episódio).
// Quando a estreia não cai no mês buscado, buscamos os detalhes da série
// para achar a data real (last_episode_to_air / next_episode_to_air) —
// descartamos o item se nenhuma data cair de fato no mês, em vez de
// inventar uma data.
async function buscarLancamentosDiscovery(providerId, inicio, fim, categoriaId) {
  const filtroCategoria = categoriaId && categoriaId !== "todas" ? `&with_genres=${categoriaId}` : "";
  const url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&language=pt-BR&watch_region=BR&with_watch_providers=${providerId}&air_date.gte=${inicio}&air_date.lte=${fim}&sort_by=popularity.desc${filtroCategoria}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar lançamentos");
  const dados = await resposta.json();
  const resultados = (dados.results || []).slice(0, 20);

  const comData = await Promise.all(
    resultados.map(async (r) => {
      if (r.first_air_date && r.first_air_date >= inicio && r.first_air_date <= fim) {
        return { ...r, dataRelevante: r.first_air_date };
      }

      try {
        const detalhesUrl = `${TMDB_BASE}/tv/${r.id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        const respostaDetalhes = await fetch(detalhesUrl);
        if (!respostaDetalhes.ok) return { ...r, dataRelevante: null };
        const detalhes = await respostaDetalhes.json();
        const candidatos = [detalhes.last_episode_to_air, detalhes.next_episode_to_air]
          .filter(Boolean)
          .map((ep) => ep.air_date)
          .filter((data) => data && data >= inicio && data <= fim);
        return { ...r, dataRelevante: candidatos[0] || null };
      } catch (erro) {
        return { ...r, dataRelevante: null };
      }
    })
  );

  return comData.filter((r) => r.dataRelevante);
}

function ordenarResultadosDiscovery(lancamentos) {
  const copia = [...lancamentos];
  if (discoveryOrdenacao === "avaliacao") {
    return copia.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  }
  return copia.sort((a, b) => new Date(a.dataRelevante) - new Date(b.dataRelevante));
}

function DiscoveryItem(r, index) {
  const poster = r.poster_path
    ? `<img src="${TMDB_IMG}${r.poster_path}" alt="">`
    : '<div class="poster-vazio-grande">🎬</div>';

  return `
    <div class="timeline-item">
      <span class="timeline-dia">${formatReleaseDate(r.dataRelevante)}</span>
      <div class="timeline-poster">${poster}</div>
      <div class="timeline-info">
        <span class="timeline-nome">${escapeHtml(r.name)}</span>
        ${r.vote_average ? `<span class="timeline-meta">★ ${r.vote_average.toFixed(1)}</span>` : ""}
      </div>
      <button type="button" class="btn-ver-serie" data-adicionar-discovery="${index}">+ Adicionar</button>
    </div>
  `;
}

function renderizarResultadosDiscovery(lancamentos) {
  discoveryResultadosAtuais = lancamentos;

  if (lancamentos.length === 0) {
    discoveryResultadosEl.innerHTML = '<p class="vazio">Nenhum lançamento de série encontrado para essa distribuidora neste mês.</p>';
    return;
  }

  discoveryResultadosEl.innerHTML = `<div class="timeline-linha">${lancamentos.map(DiscoveryItem).join("")}</div>`;
}

async function buscarDiscovery() {
  if (!discoveryDistribuidoraSelecionada || !discoveryMesSelecionado) return;

  discoveryResultadosEl.innerHTML = '<p class="vazio">Buscando lançamentos...</p>';

  const { ano, mes } = discoveryMesSelecionado;
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = ultimoDiaDoMesISO(ano, mes);

  try {
    const lancamentos = await buscarLancamentosDiscovery(discoveryDistribuidoraSelecionada, inicio, fim, discoveryCategoriaSelecionada);
    renderizarResultadosDiscovery(ordenarResultadosDiscovery(lancamentos));
  } catch (erro) {
    discoveryResultadosEl.innerHTML = '<p class="vazio">Não foi possível buscar agora. Tente novamente.</p>';
  }
}

async function iniciarDiscovery() {
  renderizarSelectMesesDiscovery();

  if (!TMDB_API_KEY) {
    discoveryDistribuidorasEl.innerHTML = '<p class="vazio">Configure sua chave do TMDB em config.js para usar o Discovery.</p>';
    return;
  }

  discoveryDistribuidorasEl.innerHTML = '<p class="vazio">Carregando distribuidoras...</p>';

  try {
    await carregarProvedoresDiscovery();
    renderizarDistribuidorasDiscovery();
  } catch (erro) {
    discoveryDistribuidorasEl.innerHTML = '<p class="vazio">Não foi possível carregar as distribuidoras. Tente novamente mais tarde.</p>';
  }

  try {
    await carregarCategoriasDiscovery();
  } catch (erro) {
    // Sem categorias não impede a busca, só perde o filtro — segue com "Todas as categorias".
  }
}

discoveryDistribuidorasEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-provider-id]");
  if (!botao) return;
  discoveryDistribuidoraSelecionada = Number(botao.dataset.providerId);
  renderizarDistribuidorasDiscovery();
  buscarDiscovery();
});

discoveryMesEl.addEventListener("change", () => {
  const [ano, mes] = discoveryMesEl.value.split("-").map(Number);
  discoveryMesSelecionado = { ano, mes };
  buscarDiscovery();
});

discoveryCategoriaEl.addEventListener("change", () => {
  discoveryCategoriaSelecionada = discoveryCategoriaEl.value;
  buscarDiscovery();
});

discoveryOrdenarEl.addEventListener("change", () => {
  discoveryOrdenacao = discoveryOrdenarEl.value;
  if (discoveryResultadosAtuais.length > 0) {
    renderizarResultadosDiscovery(ordenarResultadosDiscovery(discoveryResultadosAtuais));
  }
});

discoveryResultadosEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-adicionar-discovery]");
  if (!botao) return;
  const resultado = discoveryResultadosAtuais[Number(botao.dataset.adicionarDiscovery)];
  mudarTab("consultar");
  selecionarResultado(resultado);
});

iniciarDiscovery();
