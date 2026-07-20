const perfilAvatarBarraEl = document.getElementById("perfil-avatar-barra");
const perfilNomeBarraEl = document.getElementById("perfil-nome-barra");
const btnPerfilEl = document.getElementById("btn-perfil");
const modalPerfilEl = document.getElementById("modal-perfil");
const modalPerfilCorpoEl = document.getElementById("modal-perfil-corpo");
const btnFecharPerfilEl = document.getElementById("btn-fechar-perfil");

const AVATAR_PADRAO = "🙂";
const AVATARES_DISPONIVEIS = ["🙂", "🎬", "📺", "🍿", "👾", "🦊", "🐱", "🐶", "🌟", "🔥", "🎮", "📚"];
const DISTRIBUIDORAS_FAVORITAS_DISPONIVEIS = [
  "Netflix", "Prime Video", "Disney+", "Max", "Apple TV+", "Paramount+", "Globoplay", "Star+",
];

let perfilRef = null;
let unsubscribePerfil = null;
let perfilUsuario = null;
let modalPerfilAberto = false;
let mensagemSenhaEl = null;
let mensagemExclusaoEl = null;

function iniciarListenerPerfil(db, uid) {
  perfilRef = db.collection("usuarios").doc(uid);
  unsubscribePerfil = perfilRef.onSnapshot((doc) => {
    perfilUsuario = doc.exists ? doc.data() : null;
    atualizarBarraPerfil();
    if (modalPerfilAberto) renderModalPerfil();
    if (typeof atualizarFiltro === "function" && typeof renderizar === "function" && seriesCarregadas) {
      atualizarFiltro();
      renderizar();
    }
  });
}

function pararListenerPerfil() {
  if (unsubscribePerfil) unsubscribePerfil();
  perfilRef = null;
  perfilUsuario = null;
  modalPerfilAberto = false;
}

function atualizarBarraPerfil() {
  const nome = (perfilUsuario && perfilUsuario.nomeExibicao) || (auth.currentUser ? auth.currentUser.email.split("@")[0] : "");
  const avatar = (perfilUsuario && perfilUsuario.avatar) || AVATAR_PADRAO;
  perfilAvatarBarraEl.textContent = avatar;
  perfilNomeBarraEl.textContent = nome;
}

function formatarDataMembro(criadoEm) {
  if (!criadoEm || typeof criadoEm.toDate !== "function") return "Sem dados";
  return criadoEm.toDate().toLocaleDateString("pt-BR");
}

function AvatarSeletor(avatarAtual) {
  const opcoes = AVATARES_DISPONIVEIS.map(
    (emoji) => `
      <button
        type="button"
        class="avatar-opcao ${emoji === avatarAtual ? "selecionado" : ""}"
        data-selecionar-avatar="${emoji}"
      >${emoji}</button>
    `
  ).join("");
  return `<div class="avatar-seletor">${opcoes}</div>`;
}

function DistribuidorasFavoritasSeletor(favoritas) {
  const opcoes = DISTRIBUIDORAS_FAVORITAS_DISPONIVEIS.map((nome) => {
    const marcada = favoritas.includes(nome);
    return `
      <button type="button" class="favorita-item ${marcada ? "ativa" : ""}" data-favorita="${escapeHtml(nome)}">
        ${escapeHtml(nome)}
      </button>
    `;
  }).join("");
  return `<div class="favoritas-lista">${opcoes}</div>`;
}

function renderModalPerfil() {
  const nome = (perfilUsuario && perfilUsuario.nomeExibicao) || "";
  const avatar = (perfilUsuario && perfilUsuario.avatar) || AVATAR_PADRAO;
  const favoritas = (perfilUsuario && perfilUsuario.distribuidorasFavoritas) || [];
  const email = auth.currentUser ? auth.currentUser.email : "";
  const membroDesde = perfilUsuario ? formatarDataMembro(perfilUsuario.criadoEm) : "Sem dados";

  modalPerfilCorpoEl.innerHTML = `
    <h2>Meu perfil</h2>

    <div class="campo">
      <label>Avatar</label>
      ${AvatarSeletor(avatar)}
    </div>

    <div class="campo">
      <label for="input-nome-exibicao">Nome de exibição</label>
      <div class="busca-linha">
        <input type="text" id="input-nome-exibicao" value="${escapeHtml(nome)}" placeholder="Como quer ser chamado?">
        <button type="button" id="btn-salvar-nome">Salvar</button>
      </div>
    </div>

    <div class="campo">
      <label>Dados da conta</label>
      <p class="serie-meta">E-mail: ${escapeHtml(email)}</p>
      <p class="serie-meta">Membro desde: ${membroDesde}</p>
    </div>

    <div class="campo">
      <label>Trocar senha</label>
      <input type="password" id="input-senha-atual" placeholder="Senha atual">
      <input type="password" id="input-senha-nova" placeholder="Nova senha (mínimo 6 caracteres)" style="margin-top:0.5rem">
      <button type="button" id="btn-trocar-senha" style="margin-top:0.5rem">Alterar senha</button>
      <p id="mensagem-senha" class="vazio aviso-inline" hidden></p>
    </div>

    <div class="campo">
      <label>Distribuidoras favoritas</label>
      <p class="serie-meta">Usadas para o filtro "⭐ Minhas distribuidoras" na Minha Lista.</p>
      ${DistribuidorasFavoritasSeletor(favoritas)}
    </div>

    <div class="campo">
      ${souAdmin ? '<a href="admin.html" class="link-acao-conta">Painel admin</a>' : ""}
      <button type="button" id="btn-sair" class="btn-secundario">Sair</button>
    </div>

    <div class="zona-risco">
      <p class="zona-risco-titulo">Zona de risco</p>
      <p class="serie-meta">Excluir sua conta apaga permanentemente suas séries, atividades, notificações, amizades e indicações. Essa ação não pode ser desfeita.</p>
      <input type="password" id="input-senha-exclusao" placeholder="Digite sua senha para confirmar" style="margin-top:0.5rem">
      <button type="button" id="btn-excluir-conta" class="btn-perigo">Excluir minha conta</button>
      <div id="confirmacao-exclusao" hidden style="margin-top:0.6rem">
        <p class="serie-meta" style="color:var(--cor-alerta)">Tem certeza? Essa ação é permanente e não pode ser desfeita.</p>
        <button type="button" id="btn-confirmar-exclusao" class="btn-perigo">Sim, excluir permanentemente</button>
        <button type="button" id="btn-cancelar-exclusao" class="btn-secundario">Cancelar</button>
      </div>
      <p id="mensagem-exclusao" class="vazio aviso-inline" hidden></p>
    </div>
  `;

  mensagemSenhaEl = document.getElementById("mensagem-senha");
  mensagemExclusaoEl = document.getElementById("mensagem-exclusao");
}

function abrirModalPerfil() {
  modalPerfilAberto = true;
  renderModalPerfil();
  modalPerfilEl.hidden = false;
}

function fecharModalPerfil() {
  modalPerfilAberto = false;
  modalPerfilEl.hidden = true;
}

async function salvarNomeExibicao() {
  const input = document.getElementById("input-nome-exibicao");
  const valor = input.value.trim();
  if (!valor) return;
  await perfilRef.update({ nomeExibicao: valor });
}

async function selecionarAvatar(emoji) {
  await perfilRef.update({ avatar: emoji });
}

async function alternarDistribuidoraFavorita(nome) {
  const atuais = (perfilUsuario && perfilUsuario.distribuidorasFavoritas) || [];
  const operacao = atuais.includes(nome)
    ? firebase.firestore.FieldValue.arrayRemove(nome)
    : firebase.firestore.FieldValue.arrayUnion(nome);
  await perfilRef.update({ distribuidorasFavoritas: operacao });
}

const MENSAGENS_ERRO_SENHA = {
  "auth/wrong-password": "Senha atual incorreta.",
  "auth/invalid-credential": "Senha atual incorreta.",
  "auth/weak-password": "A nova senha precisa ter pelo menos 6 caracteres.",
  "auth/requires-recent-login": "Sessão expirada. Saia e entre novamente antes de trocar a senha.",
};

function mostrarMensagemSenha(texto, sucesso) {
  if (!mensagemSenhaEl) return;
  mensagemSenhaEl.textContent = texto;
  mensagemSenhaEl.style.color = sucesso ? "var(--cor-positivo)" : "var(--cor-alerta)";
  mensagemSenhaEl.hidden = false;
}

async function trocarSenha() {
  const senhaAtual = document.getElementById("input-senha-atual").value;
  const senhaNova = document.getElementById("input-senha-nova").value;

  if (!senhaAtual || !senhaNova) {
    mostrarMensagemSenha("Preencha a senha atual e a nova senha.", false);
    return;
  }

  try {
    const usuario = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(usuario.email, senhaAtual);
    await usuario.reauthenticateWithCredential(credential);
    await usuario.updatePassword(senhaNova);
    mostrarMensagemSenha("Senha alterada com sucesso!", true);
    document.getElementById("input-senha-atual").value = "";
    document.getElementById("input-senha-nova").value = "";
  } catch (erro) {
    mostrarMensagemSenha(MENSAGENS_ERRO_SENHA[erro.code] || "Não foi possível trocar a senha. Tente novamente.", false);
  }
}

function mostrarMensagemExclusao(texto) {
  if (!mensagemExclusaoEl) return;
  mensagemExclusaoEl.textContent = texto;
  mensagemExclusaoEl.style.color = "var(--cor-alerta)";
  mensagemExclusaoEl.hidden = false;
}

// Apaga tudo que pertence ao usuário antes da conta em si: as coleções
// filhas de usuarios/{uid} não somem sozinhas quando o doc pai é
// excluído, e os registros de amizade/indicação vivem em coleções à
// parte (podem citar o uid tanto como remetente quanto destinatário).
async function excluirDadosDoUsuario(uid) {
  const userRef = db.collection("usuarios").doc(uid);

  const [seriesSnap, atividadesSnap, notificacoesSnap, amizadeRemetenteSnap, amizadeDestinatarioSnap, indicacaoRemetenteSnap, indicacaoDestinatarioSnap] =
    await Promise.all([
      userRef.collection("series").get(),
      userRef.collection("atividades").get(),
      userRef.collection("notificacoes").get(),
      db.collection("solicitacoesAmizade").where("remetente", "==", uid).get(),
      db.collection("solicitacoesAmizade").where("destinatario", "==", uid).get(),
      db.collection("indicacoes").where("remetente", "==", uid).get(),
      db.collection("indicacoes").where("destinatario", "==", uid).get(),
    ]);

  const batch = db.batch();
  [
    ...seriesSnap.docs,
    ...atividadesSnap.docs,
    ...notificacoesSnap.docs,
    ...amizadeRemetenteSnap.docs,
    ...amizadeDestinatarioSnap.docs,
    ...indicacaoRemetenteSnap.docs,
    ...indicacaoDestinatarioSnap.docs,
  ].forEach((doc) => batch.delete(doc.ref));
  batch.delete(userRef);

  await batch.commit();
}

function pedirConfirmacaoExclusao() {
  const senha = document.getElementById("input-senha-exclusao").value;
  if (!senha) {
    mostrarMensagemExclusao("Digite sua senha para confirmar.");
    return;
  }
  document.getElementById("confirmacao-exclusao").hidden = false;
}

function cancelarExclusao() {
  document.getElementById("confirmacao-exclusao").hidden = true;
}

async function excluirConta() {
  const senha = document.getElementById("input-senha-exclusao").value;
  if (!senha) {
    mostrarMensagemExclusao("Digite sua senha para confirmar.");
    return;
  }

  try {
    const usuario = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(usuario.email, senha);
    await usuario.reauthenticateWithCredential(credential);
    await excluirDadosDoUsuario(usuario.uid);
    await usuario.delete();
  } catch (erro) {
    mostrarMensagemExclusao(MENSAGENS_ERRO_SENHA[erro.code] || "Não foi possível excluir a conta. Tente novamente.");
  }
}

btnPerfilEl.addEventListener("click", abrirModalPerfil);
btnFecharPerfilEl.addEventListener("click", fecharModalPerfil);

modalPerfilEl.addEventListener("click", (evento) => {
  if (evento.target === modalPerfilEl) fecharModalPerfil();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalPerfilEl.hidden) fecharModalPerfil();
});

modalPerfilCorpoEl.addEventListener("click", (evento) => {
  if (evento.target.id === "btn-salvar-nome") {
    salvarNomeExibicao();
    return;
  }

  if (evento.target.id === "btn-trocar-senha") {
    trocarSenha();
    return;
  }

  if (evento.target.id === "btn-sair") {
    fecharModalPerfil();
    auth.signOut();
    return;
  }

  if (evento.target.id === "btn-excluir-conta") {
    pedirConfirmacaoExclusao();
    return;
  }

  if (evento.target.id === "btn-confirmar-exclusao") {
    excluirConta();
    return;
  }

  if (evento.target.id === "btn-cancelar-exclusao") {
    cancelarExclusao();
    return;
  }

  const botaoAvatar = evento.target.closest("[data-selecionar-avatar]");
  if (botaoAvatar) {
    selecionarAvatar(botaoAvatar.dataset.selecionarAvatar);
  }
});

modalPerfilCorpoEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-favorita]");
  if (!botao) return;
  botao.classList.toggle("ativa");
  alternarDistribuidoraFavorita(botao.dataset.favorita);
});
