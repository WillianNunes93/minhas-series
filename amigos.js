const buscaAmigoEl = document.getElementById("busca-amigo");
const btnBuscarAmigoEl = document.getElementById("btn-buscar-amigo");
const resultadoBuscaAmigoEl = document.getElementById("resultado-busca-amigo");
const solicitacoesRecebidasSecaoEl = document.getElementById("solicitacoes-recebidas-secao");
const solicitacoesEnviadasSecaoEl = document.getElementById("solicitacoes-enviadas-secao");
const listaAmigosSecaoEl = document.getElementById("lista-amigos-secao");

const amigosListaViewEl = document.getElementById("amigos-lista-view");
const amigosPerfilViewEl = document.getElementById("amigos-perfil-view");
const btnVoltarPerfilAmigoEl = document.getElementById("btn-voltar-perfil-amigo");
const amigoPerfilNomeTituloEl = document.getElementById("amigo-perfil-nome-titulo");
const amigoPerfilBuscaEl = document.getElementById("amigo-perfil-busca");
const amigoPerfilOrdenarEl = document.getElementById("amigo-perfil-ordenar");
const amigoPerfilDistribuidoraEl = document.getElementById("amigo-perfil-distribuidora");
const amigoPerfilGridEl = document.getElementById("amigo-perfil-grid");
const btnAbrirFiltrosAmigoPerfilEl = document.getElementById("btn-abrir-filtros-amigo-perfil");
const amigoPerfilFiltrosOverlayEl = document.getElementById("amigo-perfil-filtros-overlay");
const listaFiltrosAvancadosAmigoPerfilEl = amigosPerfilViewEl.querySelector(".lista-filtros-avancados");

let solicitacoesAmizadeRef = null;
let unsubscribeSolicitacoesRecebidas = null;
let unsubscribeSolicitacoesEnviadas = null;
let ultimoSnapshotRecebidas = [];
let ultimoSnapshotEnviadas = [];
let solicitacoesRecebidas = [];
let solicitacoesEnviadas = [];
let amigosAceitos = [];
let listenersSeriesAmigos = {};
let ultimoResultadoBusca = [];

let amigoPerfilAtual = null;
let distribuidoraSelecionadaAmigo = "todas";
let textoBuscaAmigo = "";
let ordemSelecionadaAmigo = "recentes";

let erroPermissaoAmizade = false;

function iniciarListenersAmizade(db, uid) {
  solicitacoesAmizadeRef = db.collection("solicitacoesAmizade");
  erroPermissaoAmizade = false;
  renderizarAmigos();

  const aoFalhar = () => {
    erroPermissaoAmizade = true;
    renderizarAmigos();
  };

  unsubscribeSolicitacoesRecebidas = solicitacoesAmizadeRef
    .where("destinatario", "==", uid)
    .onSnapshot((snapshot) => {
      ultimoSnapshotRecebidas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      recomputarAmizades(uid);
    }, aoFalhar);

  unsubscribeSolicitacoesEnviadas = solicitacoesAmizadeRef
    .where("remetente", "==", uid)
    .onSnapshot((snapshot) => {
      ultimoSnapshotEnviadas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      recomputarAmizades(uid);
    }, aoFalhar);
}

function pararListenersAmizade() {
  if (unsubscribeSolicitacoesRecebidas) unsubscribeSolicitacoesRecebidas();
  if (unsubscribeSolicitacoesEnviadas) unsubscribeSolicitacoesEnviadas();
  Object.values(listenersSeriesAmigos).forEach((entrada) => entrada.unsubscribe());
  listenersSeriesAmigos = {};
  solicitacoesAmizadeRef = null;
  ultimoSnapshotRecebidas = [];
  ultimoSnapshotEnviadas = [];
  solicitacoesRecebidas = [];
  solicitacoesEnviadas = [];
  amigosAceitos = [];
  erroPermissaoAmizade = false;
}

function recomputarAmizades(uid) {
  const todas = [...ultimoSnapshotRecebidas, ...ultimoSnapshotEnviadas];

  solicitacoesRecebidas = ultimoSnapshotRecebidas.filter((s) => s.status === "pendente");
  solicitacoesEnviadas = ultimoSnapshotEnviadas.filter((s) => s.status === "pendente");

  amigosAceitos = todas
    .filter((s) => s.status === "aceita")
    .map((s) => {
      const souRemetente = s.remetente === uid;
      return {
        uid: souRemetente ? s.destinatario : s.remetente,
        nomeExibicao: souRemetente ? s.destinatarioNome : s.remetenteNome,
        avatar: souRemetente ? s.destinatarioAvatar : s.remetenteAvatar,
      };
    });

  atualizarListenersSeriesAmigos();
  renderizarAmigos();
}

function atualizarListenersSeriesAmigos() {
  const uidsAtuais = new Set(amigosAceitos.map((a) => a.uid));

  Object.keys(listenersSeriesAmigos).forEach((uidAmigo) => {
    // Remove tanto quem deixou de ser amigo quanto listeners presos em erro
    // (ex.: a amizade ainda não tinha sido aceita quando o listener foi
    // criado) — assim eles são recriados e tentam de novo.
    if (!uidsAtuais.has(uidAmigo) || listenersSeriesAmigos[uidAmigo].erro) {
      listenersSeriesAmigos[uidAmigo].unsubscribe();
      delete listenersSeriesAmigos[uidAmigo];
    }
  });

  amigosAceitos.forEach((amigo) => {
    if (listenersSeriesAmigos[amigo.uid]) return;

    const entrada = { series: [], erro: false, unsubscribe: () => {} };
    listenersSeriesAmigos[amigo.uid] = entrada;

    entrada.unsubscribe = db
      .collection("usuarios")
      .doc(amigo.uid)
      .collection("series")
      .onSnapshot(
        (snapshot) => {
          entrada.series = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          entrada.erro = false;
          renderizarAmigos();
        },
        () => {
          entrada.erro = true;
          renderizarAmigos();
        }
      );
  });
}

async function buscarUsuarioAmigo() {
  const termo = buscaAmigoEl.value.trim();
  if (!termo) return;

  ultimoResultadoBusca = [];
  resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Buscando...</p>';

  const termoBusca = termo.toLowerCase();

  try {
    const snapshot = await db.collection("usuarios").get();
    const meuUid = auth.currentUser.uid;
    const encontrados = snapshot.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.uid !== meuUid)
      .filter(
        (u) =>
          (u.nomeExibicao || "").toLowerCase().includes(termoBusca) ||
          (u.email || "").toLowerCase().includes(termoBusca)
      );

    if (encontrados.length === 0) {
      resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Nenhum usuário encontrado.</p>';
      return;
    }

    ultimoResultadoBusca = encontrados;
    renderizarResultadoBuscaAmigo();
  } catch (erro) {
    resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Não foi possível buscar agora. Tente novamente.</p>';
  }
}

function estadoAmizadeComUid(uid) {
  if (amigosAceitos.some((a) => a.uid === uid)) return { tipo: "amigo" };
  if (solicitacoesEnviadas.some((s) => s.destinatario === uid)) return { tipo: "enviada" };
  const recebida = solicitacoesRecebidas.find((s) => s.remetente === uid);
  if (recebida) return { tipo: "recebida", id: recebida.id };
  return { tipo: "nenhum" };
}

function ResultadoBuscaAmigoItem(u, index) {
  const estado = estadoAmizadeComUid(u.uid);

  let acaoHtml;
  if (estado.tipo === "amigo") {
    acaoHtml = '<span class="serie-meta">✓ Já são amigos</span>';
  } else if (estado.tipo === "enviada") {
    acaoHtml = '<span class="serie-meta">Aguardando aceite</span>';
  } else if (estado.tipo === "recebida") {
    acaoHtml = `<button type="button" data-aceitar-solicitacao="${estado.id}">Aceitar solicitação</button>`;
  } else {
    acaoHtml = `<button type="button" data-adicionar-amigo="${index}">Adicionar amigo</button>`;
  }

  return `
    <div class="amigo-item">
      <span class="perfil-avatar-barra">${u.avatar || AVATAR_PADRAO}</span>
      <span class="amigo-nome">${escapeHtml(u.nomeExibicao || u.email)}</span>
      ${acaoHtml}
    </div>
  `;
}

function renderizarResultadoBuscaAmigo() {
  if (ultimoResultadoBusca.length === 0) return;
  resultadoBuscaAmigoEl.innerHTML = ultimoResultadoBusca.map(ResultadoBuscaAmigoItem).join("");
}

async function enviarSolicitacaoAmizade(alvo) {
  const meuUid = auth.currentUser.uid;
  const idDireto = `${meuUid}_${alvo.uid}`;
  const idInverso = `${alvo.uid}_${meuUid}`;

  const [docDireto, docInverso] = await Promise.all([
    solicitacoesAmizadeRef.doc(idDireto).get(),
    solicitacoesAmizadeRef.doc(idInverso).get(),
  ]);

  if (docDireto.exists || docInverso.exists) {
    const existente = docDireto.exists ? docDireto.data() : docInverso.data();
    resultadoBuscaAmigoEl.innerHTML = `<p class="vazio">${
      existente.status === "aceita" ? "Vocês já são amigos." : "Já existe uma solicitação pendente entre vocês."
    }</p>`;
    return;
  }

  await solicitacoesAmizadeRef.doc(idDireto).set({
    remetente: meuUid,
    destinatario: alvo.uid,
    remetenteNome: (perfilUsuario && perfilUsuario.nomeExibicao) || auth.currentUser.email.split("@")[0],
    remetenteAvatar: (perfilUsuario && perfilUsuario.avatar) || AVATAR_PADRAO,
    destinatarioNome: alvo.nomeExibicao || alvo.email.split("@")[0],
    destinatarioAvatar: alvo.avatar || AVATAR_PADRAO,
    status: "pendente",
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });

  resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Solicitação enviada!</p>';
}

async function aceitarSolicitacao(id) {
  await solicitacoesAmizadeRef.doc(id).update({ status: "aceita" });
}

async function recusarOuRemoverSolicitacao(id) {
  await solicitacoesAmizadeRef.doc(id).delete();
}

async function removerAmizade(uidAmigo) {
  const meuUid = auth.currentUser.uid;
  const idDireto = `${meuUid}_${uidAmigo}`;
  const idInverso = `${uidAmigo}_${meuUid}`;

  const [docDireto, docInverso] = await Promise.all([
    solicitacoesAmizadeRef.doc(idDireto).get(),
    solicitacoesAmizadeRef.doc(idInverso).get(),
  ]);

  if (docDireto.exists) await solicitacoesAmizadeRef.doc(idDireto).delete();
  if (docInverso.exists) await solicitacoesAmizadeRef.doc(idInverso).delete();
}

function SolicitacaoRecebidaItem(s) {
  return `
    <div class="amigo-item">
      <span class="perfil-avatar-barra">${s.remetenteAvatar || AVATAR_PADRAO}</span>
      <span class="amigo-nome">${escapeHtml(s.remetenteNome)}</span>
      <div class="amigo-acoes">
        <button type="button" onclick="aceitarSolicitacao('${s.id}')">Aceitar</button>
        <button type="button" class="btn-secundario" onclick="recusarOuRemoverSolicitacao('${s.id}')">Recusar</button>
      </div>
    </div>
  `;
}

function SolicitacaoEnviadaItem(s) {
  return `
    <div class="amigo-item">
      <span class="perfil-avatar-barra">${s.destinatarioAvatar || AVATAR_PADRAO}</span>
      <span class="amigo-nome">${escapeHtml(s.destinatarioNome)}</span>
      <span class="serie-meta">Aguardando aceite</span>
      <button type="button" class="btn-secundario" onclick="recusarOuRemoverSolicitacao('${s.id}')">Cancelar</button>
    </div>
  `;
}

function SerieAmigoItem(serie) {
  const poster = serie.poster
    ? `<img src="${serie.poster}" alt="">`
    : '<div class="poster-vazio-grande">🎬</div>';
  return `
    <div class="amigo-serie-item" title="${escapeHtml(serie.nome)}">
      <div class="amigo-serie-poster">${poster}</div>
      <span class="amigo-serie-nome">${escapeHtml(serie.nome)}</span>
    </div>
  `;
}

function CardAmigo(amigo) {
  const dados = listenersSeriesAmigos[amigo.uid] || { series: [], erro: false };

  if (dados.erro) {
    return `
      <div class="amigo-card">
        <div class="amigo-cabecalho">
          <span class="perfil-avatar-barra">${amigo.avatar || AVATAR_PADRAO}</span>
          <span class="amigo-nome">${escapeHtml(amigo.nomeExibicao)}</span>
          <button type="button" class="btn-secundario" data-remover-amigo="${amigo.uid}">Remover amigo</button>
        </div>
        <p class="vazio">Não foi possível carregar as séries deste amigo.</p>
      </div>
    `;
  }

  const favoritas = dados.series.filter((s) => s.favorita);
  const andamento = dados.series.filter((s) => s.status === "assistindo");

  return `
    <div class="amigo-card">
      <div class="amigo-cabecalho">
        <span class="perfil-avatar-barra">${amigo.avatar || AVATAR_PADRAO}</span>
        <span class="amigo-nome">${escapeHtml(amigo.nomeExibicao)}</span>
        <button type="button" class="btn-secundario" data-ver-perfil-amigo="${amigo.uid}">Ver perfil completo</button>
        <button type="button" class="btn-secundario" data-remover-amigo="${amigo.uid}">Remover amigo</button>
      </div>
      <p class="amigo-secao-titulo">⭐ Favoritas</p>
      ${favoritas.length > 0 ? `<div class="amigo-serie-linha">${favoritas.map(SerieAmigoItem).join("")}</div>` : '<p class="vazio">Nenhuma série favorita ainda.</p>'}
      <p class="amigo-secao-titulo">▶️ Em andamento</p>
      ${andamento.length > 0 ? `<div class="amigo-serie-linha">${andamento.map(SerieAmigoItem).join("")}</div>` : '<p class="vazio">Nenhuma série em andamento.</p>'}
    </div>
  `;
}

function abrirPerfilAmigo(uid) {
  amigoPerfilAtual = uid;
  distribuidoraSelecionadaAmigo = "todas";
  textoBuscaAmigo = "";
  ordemSelecionadaAmigo = "recentes";
  amigoPerfilBuscaEl.value = "";
  amigoPerfilOrdenarEl.value = "recentes";

  atualizarFiltroDistribuidoraAmigo();
  renderizarGradeAmigoPerfil();

  amigosListaViewEl.hidden = true;
  amigosPerfilViewEl.hidden = false;
}

function fecharPerfilAmigo() {
  amigoPerfilAtual = null;
  amigosPerfilViewEl.hidden = true;
  amigosListaViewEl.hidden = false;
}

function abrirFiltrosAmigoPerfil() {
  listaFiltrosAvancadosAmigoPerfilEl.classList.add("aberta");
  amigoPerfilFiltrosOverlayEl.hidden = false;
}

function fecharFiltrosAmigoPerfil() {
  listaFiltrosAvancadosAmigoPerfilEl.classList.remove("aberta");
  amigoPerfilFiltrosOverlayEl.hidden = true;
}

function atualizarFiltroDistribuidoraAmigo() {
  const dados = listenersSeriesAmigos[amigoPerfilAtual] || { series: [] };
  const todasDistribuidoras = new Set();
  dados.series.forEach((s) => distribuidorasDaSerie(s).forEach((d) => todasDistribuidoras.add(d)));
  const distribuidoras = [...todasDistribuidoras].sort();
  const valorAtual = distribuidoraSelecionadaAmigo;

  amigoPerfilDistribuidoraEl.innerHTML = '<option value="todas">Todas as distribuidoras</option>';
  distribuidoras.forEach((d) => {
    const option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    amigoPerfilDistribuidoraEl.appendChild(option);
  });

  amigoPerfilDistribuidoraEl.value = distribuidoras.includes(valorAtual) ? valorAtual : "todas";
  distribuidoraSelecionadaAmigo = amigoPerfilDistribuidoraEl.value;
}

function ordenarSeriesAmigoPerfil(lista) {
  const copia = [...lista];
  if (ordemSelecionadaAmigo === "nota") {
    copia.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  } else if (ordemSelecionadaAmigo === "alfabetica") {
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

function renderizarPillsTemporadasReadonly(serie) {
  if (!serie.temporadas) return "";
  const assistidas = serie.temporadasAssistidas || [];
  const pills = [];
  for (let numero = 1; numero <= serie.temporadas; numero += 1) {
    const marcada = assistidas.includes(numero);
    pills.push(
      `<span class="pill-temporada ${marcada ? "marcada" : ""}" title="Temporada ${numero}${marcada ? " (assistida)" : ""}">${numero}</span>`
    );
  }
  return `<div class="temporadas-pills" title="Temporadas assistidas">${pills.join("")}</div>`;
}

function CardSerieAmigoReadonly(serie) {
  const temNota = serie.nota !== null && serie.nota !== undefined && serie.nota !== "";
  const duracao = textoDuracao(serie) ? `<span>${textoDuracao(serie)}</span>` : "";
  const poster = serie.poster
    ? `<img class="serie-poster" src="${serie.poster}" alt="">`
    : `<div class="poster-vazio-grande">🎬</div>`;
  const cancelada = serie.cancelada ? '<span class="tag-cancelada">Cancelada</span>' : "";
  const trailer = serie.trailerUrl
    ? `<div class="serie-overlay"><a class="icon-btn" href="${serie.trailerUrl}" target="_blank" rel="noopener" title="Assistir trailer" onclick="event.stopPropagation()">▶</a></div>`
    : "";

  return `
    <div class="serie-card" style="--cor-distribuidora:${corDistribuidoraPrincipal(serie)}">
      <div class="serie-poster-wrap">
        ${poster}
        ${cancelada}
        ${serie.favorita ? '<span class="tag-favorita">★</span>' : ""}
        ${trailer}
      </div>
      <div class="serie-info">
        <div class="serie-cabecalho">
          <span class="serie-nome">${escapeHtml(serie.nome)}</span>
          ${renderizarContadorTemporada(serie)}
        </div>
        ${renderizarSelosDistribuidoras(serie)}
        <span class="serie-meta"><span class="badge ${serie.status}">${statusLabel[serie.status] || serie.status}</span></span>
        <span class="serie-meta">${duracao}</span>
        <span class="serie-meta">${temNota ? `⭐ ${serie.nota}` : "Sem nota"}</span>
        ${renderizarPillsTemporadasReadonly(serie)}
      </div>
    </div>
  `;
}

function renderizarGradeAmigoPerfil() {
  if (!amigoPerfilAtual) return;

  const amigo = amigosAceitos.find((a) => a.uid === amigoPerfilAtual);
  if (!amigo) {
    fecharPerfilAmigo();
    return;
  }

  amigoPerfilNomeTituloEl.textContent = amigo.nomeExibicao;

  const dados = listenersSeriesAmigos[amigo.uid] || { series: [], erro: false };
  if (dados.erro) {
    amigoPerfilGridEl.innerHTML = '<p class="vazio">Não foi possível carregar as séries deste amigo.</p>';
    return;
  }

  let filtradas = distribuidoraSelecionadaAmigo === "todas"
    ? dados.series
    : dados.series.filter((s) => distribuidorasDaSerie(s).includes(distribuidoraSelecionadaAmigo));

  const termo = textoBuscaAmigo.trim().toLowerCase();
  if (termo) filtradas = filtradas.filter((s) => s.nome.toLowerCase().includes(termo));

  if (filtradas.length === 0) {
    amigoPerfilGridEl.innerHTML = '<p class="vazio">Nenhuma série encontrada.</p>';
    return;
  }

  filtradas = ordenarSeriesAmigoPerfil(filtradas);
  amigoPerfilGridEl.innerHTML = `<div class="serie-grid">${filtradas.map(CardSerieAmigoReadonly).join("")}</div>`;
}

function renderizarAmigos() {
  if (erroPermissaoAmizade) {
    solicitacoesRecebidasSecaoEl.innerHTML = "";
    solicitacoesEnviadasSecaoEl.innerHTML = "";
    listaAmigosSecaoEl.innerHTML = '<p class="vazio">Não foi possível carregar amigos agora. Tente novamente mais tarde.</p>';
    return;
  }

  solicitacoesRecebidasSecaoEl.innerHTML = solicitacoesRecebidas.length > 0
    ? `<h3 class="amigos-subtitulo">Solicitações recebidas</h3>${solicitacoesRecebidas.map(SolicitacaoRecebidaItem).join("")}`
    : "";

  solicitacoesEnviadasSecaoEl.innerHTML = solicitacoesEnviadas.length > 0
    ? `<h3 class="amigos-subtitulo">Solicitações enviadas</h3>${solicitacoesEnviadas.map(SolicitacaoEnviadaItem).join("")}`
    : "";

  listaAmigosSecaoEl.innerHTML = `
    <h3 class="amigos-subtitulo">Meus amigos</h3>
    ${amigosAceitos.length > 0 ? amigosAceitos.map(CardAmigo).join("") : '<p class="vazio">Você ainda não tem amigos adicionados.</p>'}
  `;

  renderizarResultadoBuscaAmigo();

  if (amigoPerfilAtual) {
    atualizarFiltroDistribuidoraAmigo();
    renderizarGradeAmigoPerfil();
  }
}

btnBuscarAmigoEl.addEventListener("click", buscarUsuarioAmigo);

buscaAmigoEl.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    btnBuscarAmigoEl.click();
  }
});

resultadoBuscaAmigoEl.addEventListener("click", (evento) => {
  const botaoAdicionar = evento.target.closest("[data-adicionar-amigo]");
  if (botaoAdicionar) {
    enviarSolicitacaoAmizade(ultimoResultadoBusca[Number(botaoAdicionar.dataset.adicionarAmigo)]);
    return;
  }
  const botaoAceitar = evento.target.closest("[data-aceitar-solicitacao]");
  if (botaoAceitar) {
    aceitarSolicitacao(botaoAceitar.dataset.aceitarSolicitacao);
  }
});

listaAmigosSecaoEl.addEventListener("click", (evento) => {
  const botaoRemover = evento.target.closest("[data-remover-amigo]");
  if (botaoRemover) {
    removerAmizade(botaoRemover.dataset.removerAmigo);
    return;
  }
  const botaoVerPerfil = evento.target.closest("[data-ver-perfil-amigo]");
  if (botaoVerPerfil) abrirPerfilAmigo(botaoVerPerfil.dataset.verPerfilAmigo);
});

btnVoltarPerfilAmigoEl.addEventListener("click", fecharPerfilAmigo);

amigoPerfilBuscaEl.addEventListener("input", (evento) => {
  textoBuscaAmigo = evento.target.value;
  renderizarGradeAmigoPerfil();
});

amigoPerfilOrdenarEl.addEventListener("change", (evento) => {
  ordemSelecionadaAmigo = evento.target.value;
  renderizarGradeAmigoPerfil();
});

amigoPerfilDistribuidoraEl.addEventListener("change", (evento) => {
  distribuidoraSelecionadaAmigo = evento.target.value;
  renderizarGradeAmigoPerfil();
});

btnAbrirFiltrosAmigoPerfilEl.addEventListener("click", () => {
  if (listaFiltrosAvancadosAmigoPerfilEl.classList.contains("aberta")) fecharFiltrosAmigoPerfil();
  else abrirFiltrosAmigoPerfil();
});

amigoPerfilFiltrosOverlayEl.addEventListener("click", fecharFiltrosAmigoPerfil);
