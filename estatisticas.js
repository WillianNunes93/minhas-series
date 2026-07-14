const estatisticasEl = document.getElementById("estatisticas-conteudo");

// O sistema não guarda gênero por série (só é usado de forma temporária
// durante a busca, antes de salvar) nem a data em que uma série foi
// marcada como concluída. Sem esses dados, essas duas estatísticas
// aparecem como "Sem dados" em vez de valores inventados.
function episodiosAssistidosTotais(listaSeries) {
  return listaSeries.reduce((total, serie) => {
    const porTemporada = Object.values(serie.episodiosAssistidos || {});
    return total + porTemporada.reduce((soma, episodios) => soma + episodios.length, 0);
  }, 0);
}

function streamingMaisUtilizado(listaSeries) {
  const contagem = {};
  listaSeries.forEach((serie) => {
    distribuidorasDaSerie(serie).forEach((nome) => {
      contagem[nome] = (contagem[nome] || 0) + 1;
    });
  });

  const entradas = Object.entries(contagem);
  if (entradas.length === 0) return "Sem dados";

  entradas.sort((a, b) => b[1] - a[1]);
  return entradas[0][0];
}

// Hook: centraliza o cálculo de todos os indicadores da página de Estatísticas.
function useEstatisticasGerais(listaSeries) {
  const geral = useEstatisticasBiblioteca(listaSeries);

  return {
    total: geral.total,
    concluidas: geral.completa,
    emAndamento: geral.assistindo,
    episodiosAssistidos: episodiosAssistidosTotais(listaSeries),
    generoMaisAssistido: "Sem dados",
    streamingMaisUtilizado: listaSeries.length > 0 ? streamingMaisUtilizado(listaSeries) : "Sem dados",
    anoMaisConcluidas: "Sem dados",
  };
}

function EstatisticaCard(icone, valor, titulo) {
  return `
    <div class="stat-card-dashboard">
      <span class="stat-icone">${icone}</span>
      <span class="stat-valor">${valor}</span>
      <span class="stat-titulo">${titulo}</span>
    </div>
  `;
}

function EstatisticasSkeleton() {
  const cardFalso = `
    <div class="stat-card-dashboard">
      <span class="skeleton skeleton-icone"></span>
      <span class="skeleton skeleton-linha" style="width:50%;height:1.5rem;margin-top:0.4rem;"></span>
      <span class="skeleton skeleton-linha" style="width:70%;margin-top:0.3rem;"></span>
    </div>
  `;
  return `<div class="dashboard-stats-grid">${cardFalso.repeat(7)}</div>`;
}

function EstatisticasPage() {
  if (!seriesCarregadas) {
    estatisticasEl.innerHTML = EstatisticasSkeleton();
    return;
  }

  const dados = useEstatisticasGerais(series);

  estatisticasEl.innerHTML = `
    <div class="dashboard-stats-grid">
      ${EstatisticaCard("📺", dados.total, "Séries cadastradas")}
      ${EstatisticaCard("✅", dados.concluidas, "Concluídas")}
      ${EstatisticaCard("▶️", dados.emAndamento, "Em andamento")}
      ${EstatisticaCard("🎬", dados.episodiosAssistidos, "Episódios assistidos")}
      ${EstatisticaCard("🔥", escapeHtml(String(dados.generoMaisAssistido)), "Gênero mais assistido")}
      ${EstatisticaCard("📡", escapeHtml(String(dados.streamingMaisUtilizado)), "Streaming mais utilizado")}
      ${EstatisticaCard("🏆", escapeHtml(String(dados.anoMaisConcluidas)), "Ano com mais concluídas")}
    </div>
  `;
}

EstatisticasPage();
