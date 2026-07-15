const buscaAmigoEl = document.getElementById("busca-amigo");
const btnBuscarAmigoEl = document.getElementById("btn-buscar-amigo");
const resultadoBuscaAmigoEl = document.getElementById("resultado-busca-amigo");
const solicitacoesRecebidasSecaoEl = document.getElementById("solicitacoes-recebidas-secao");
const solicitacoesEnviadasSecaoEl = document.getElementById("solicitacoes-enviadas-secao");
const listaAmigosSecaoEl = document.getElementById("lista-amigos-secao");

let solicitacoesAmizadeRef = null;
let unsubscribeSolicitacoesRecebidas = null;
let unsubscribeSolicitacoesEnviadas = null;
let ultimoSnapshotRecebidas = [];
let ultimoSnapshotEnviadas = [];
let solicitacoesRecebidas = [];
let solicitacoesEnviadas = [];
let amigosAceitos = [];
let listenersSeriesAmigos = {};

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
    if (!uidsAtuais.has(uidAmigo)) {
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

  resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Buscando...</p>';

  const ehEmail = termo.includes("@");
  const campo = ehEmail ? "email" : "nomeExibicao";
  const valorBusca = ehEmail ? termo.toLowerCase() : termo;

  try {
    const snapshot = await db.collection("usuarios").where(campo, "==", valorBusca).get();
    const meuUid = auth.currentUser.uid;
    const encontrados = snapshot.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.uid !== meuUid);

    if (encontrados.length === 0) {
      resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Nenhum usuário encontrado.</p>';
      return;
    }

    resultadoBuscaAmigoEl.innerHTML = encontrados
      .map(
        (u, index) => `
          <div class="amigo-item">
            <span class="perfil-avatar-barra">${u.avatar || AVATAR_PADRAO}</span>
            <span class="amigo-nome">${escapeHtml(u.nomeExibicao || u.email)}</span>
            <button type="button" data-adicionar-amigo="${index}">Adicionar amigo</button>
          </div>
        `
      )
      .join("");

    resultadoBuscaAmigoEl.querySelectorAll("[data-adicionar-amigo]").forEach((botao) => {
      botao.addEventListener("click", () => enviarSolicitacaoAmizade(encontrados[Number(botao.dataset.adicionarAmigo)]));
    });
  } catch (erro) {
    resultadoBuscaAmigoEl.innerHTML = '<p class="vazio">Não foi possível buscar agora. Tente novamente.</p>';
  }
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
        <button type="button" class="btn-secundario" data-remover-amigo="${amigo.uid}">Remover amigo</button>
      </div>
      <p class="amigo-secao-titulo">⭐ Favoritas</p>
      ${favoritas.length > 0 ? `<div class="amigo-serie-linha">${favoritas.map(SerieAmigoItem).join("")}</div>` : '<p class="vazio">Nenhuma série favorita ainda.</p>'}
      <p class="amigo-secao-titulo">▶️ Em andamento</p>
      ${andamento.length > 0 ? `<div class="amigo-serie-linha">${andamento.map(SerieAmigoItem).join("")}</div>` : '<p class="vazio">Nenhuma série em andamento.</p>'}
    </div>
  `;
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
}

btnBuscarAmigoEl.addEventListener("click", buscarUsuarioAmigo);

buscaAmigoEl.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    btnBuscarAmigoEl.click();
  }
});

listaAmigosSecaoEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-remover-amigo]");
  if (botao) removerAmizade(botao.dataset.removerAmigo);
});
