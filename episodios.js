const modalEpisodiosEl = document.getElementById("modal-episodios");
const modalEpisodiosCorpoEl = document.getElementById("modal-episodios-corpo");
const btnFecharEpisodiosEl = document.getElementById("btn-fechar-episodios");

let serieModalId = null;
let temporadaSelecionadaModal = null;

// O TMDB não nos dá a contagem de episódios por temporada sem uma nova
// chamada à API (fora do escopo desta sprint). Aproximamos dividindo o
// total de episódios da série igualmente entre as temporadas.
function episodiosDaTemporada(serie, numeroTemporada) {
  if (!serie.episodios || !serie.temporadas) return null;
  return Math.max(1, Math.round(serie.episodios / serie.temporadas));
}

function episodiosAssistidosDaTemporada(serie, numeroTemporada) {
  return (serie.episodiosAssistidos && serie.episodiosAssistidos[numeroTemporada]) || [];
}

function proximoEpisodioNaoAssistido(totalEpisodios, assistidos) {
  for (let numero = 1; numero <= totalEpisodios; numero += 1) {
    if (!assistidos.includes(numero)) return numero;
  }
  return null;
}

async function alternarEpisodioAssistido(serieId, numeroTemporada, numeroEpisodio) {
  const serie = series.find((s) => s.id === serieId);
  if (!serie) return;

  const atuais = episodiosAssistidosDaTemporada(serie, numeroTemporada);
  const novos = atuais.includes(numeroEpisodio)
    ? atuais.filter((n) => n !== numeroEpisodio)
    : [...atuais, numeroEpisodio].sort((a, b) => a - b);

  await seriesRef.doc(serieId).update({
    [`episodiosAssistidos.${numeroTemporada}`]: novos,
    progressUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function marcarTodosEpisodiosAssistidos(serieId, numeroTemporada) {
  const serie = series.find((s) => s.id === serieId);
  if (!serie) return;

  const total = episodiosDaTemporada(serie, numeroTemporada);
  if (total === null) return;

  const todos = Array.from({ length: total }, (_, indice) => indice + 1);

  await seriesRef.doc(serieId).update({
    [`episodiosAssistidos.${numeroTemporada}`]: todos,
    progressUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function TemporadaSeletor(serie, temporadaAtiva) {
  const pills = [];
  for (let numero = 1; numero <= serie.temporadas; numero += 1) {
    const total = episodiosDaTemporada(serie, numero);
    const assistidos = episodiosAssistidosDaTemporada(serie, numero);
    const completa = total !== null && assistidos.length >= total;
    pills.push(`
      <button
        type="button"
        class="temporada-seletor-pill ${numero === temporadaAtiva ? "ativa" : ""} ${completa ? "completa" : ""}"
        data-selecionar-temporada="${numero}"
      >Temporada ${numero}${completa ? " ✓" : ""}</button>
    `);
  }
  return `<div class="temporada-seletor">${pills.join("")}</div>`;
}

function EpisodioItem(numero, assistido) {
  return `
    <label class="episodio-item">
      <input type="checkbox" data-episodio="${numero}" ${assistido ? "checked" : ""}>
      Episódio ${numero}
    </label>
  `;
}

function ListaEpisodios(serie, numeroTemporada) {
  const total = episodiosDaTemporada(serie, numeroTemporada);
  const assistidos = episodiosAssistidosDaTemporada(serie, numeroTemporada);

  if (total === null) {
    return '<p class="vazio">Número de episódios não disponível para esta série.</p>';
  }

  const itens = [];
  for (let numero = 1; numero <= total; numero += 1) {
    itens.push(EpisodioItem(numero, assistidos.includes(numero)));
  }

  const proximo = proximoEpisodioNaoAssistido(total, assistidos);
  const todosAssistidos = assistidos.length >= total;

  return `
    <div class="episodios-acoes">
      <button type="button" class="btn-marcar-todos" data-marcar-todos="${numeroTemporada}" ${todosAssistidos ? "disabled" : ""}>
        Marcar todos como assistidos
      </button>
    </div>
    <div class="episodio-lista">${itens.join("")}</div>
    <p class="progresso-contador">${assistidos.length} de ${total} episódios assistidos</p>
    <p class="proximo-episodio-texto">${
      proximo ? `Próximo episódio: Episódio ${proximo}` : "Todos os episódios desta temporada foram assistidos."
    }</p>
  `;
}

function renderModalEpisodios() {
  const serie = series.find((s) => s.id === serieModalId);
  if (!serie) {
    fecharModalEpisodios();
    return;
  }

  modalEpisodiosCorpoEl.innerHTML = `
    <h2>${escapeHtml(serie.nome)}</h2>
    ${TemporadaSeletor(serie, temporadaSelecionadaModal)}
    ${ListaEpisodios(serie, temporadaSelecionadaModal)}
  `;
}

function abrirModalEpisodios(serieId) {
  const serie = series.find((s) => s.id === serieId);
  if (!serie || !serie.temporadas) return;

  serieModalId = serieId;
  temporadaSelecionadaModal = serie.temporadas;
  renderModalEpisodios();
  modalEpisodiosEl.hidden = false;
}

function fecharModalEpisodios() {
  modalEpisodiosEl.hidden = true;
  serieModalId = null;
  temporadaSelecionadaModal = null;
}

function atualizarModalEpisodios() {
  if (!serieModalId) return;
  renderModalEpisodios();
}

modalEpisodiosCorpoEl.addEventListener("click", (evento) => {
  const botaoTemporada = evento.target.closest("[data-selecionar-temporada]");
  if (botaoTemporada) {
    temporadaSelecionadaModal = Number(botaoTemporada.dataset.selecionarTemporada);
    renderModalEpisodios();
    return;
  }

  const botaoMarcarTodos = evento.target.closest("[data-marcar-todos]");
  if (botaoMarcarTodos) {
    marcarTodosEpisodiosAssistidos(serieModalId, Number(botaoMarcarTodos.dataset.marcarTodos));
  }
});

modalEpisodiosCorpoEl.addEventListener("change", (evento) => {
  const checkbox = evento.target.closest("[data-episodio]");
  if (!checkbox) return;
  alternarEpisodioAssistido(serieModalId, temporadaSelecionadaModal, Number(checkbox.dataset.episodio));
});

btnFecharEpisodiosEl.addEventListener("click", fecharModalEpisodios);

modalEpisodiosEl.addEventListener("click", (evento) => {
  if (evento.target === modalEpisodiosEl) fecharModalEpisodios();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalEpisodiosEl.hidden) fecharModalEpisodios();
});
