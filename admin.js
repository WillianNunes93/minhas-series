firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const telaCarregandoEl = document.getElementById("tela-carregando");
const telaNegadoEl = document.getElementById("tela-negado");
const adminContainerEl = document.getElementById("admin-container");
const usuarioEmailEl = document.getElementById("usuario-email");
const statsGridEl = document.getElementById("stats-grid");
const tabelaUsuariosEl = document.getElementById("tabela-usuarios");

function formatarData(timestamp) {
  if (!timestamp) return "—";
  return timestamp.toDate().toLocaleDateString("pt-BR");
}

function formatarDataHora(timestamp) {
  if (!timestamp) return "Nunca acessou";
  return timestamp.toDate().toLocaleString("pt-BR");
}

async function carregarDadosAdmin() {
  const [usuariosSnap, seriesSnap] = await Promise.all([
    db.collection("usuarios").get(),
    db.collectionGroup("series").get(),
  ]);

  const seriesPorUsuario = {};
  const contagemDistribuidoras = {};

  seriesSnap.forEach((doc) => {
    const uid = doc.ref.parent.parent.id;
    seriesPorUsuario[uid] = (seriesPorUsuario[uid] || 0) + 1;

    const distribuidoras = doc.data().distribuidoras || [];
    distribuidoras.forEach((d) => {
      contagemDistribuidoras[d] = (contagemDistribuidoras[d] || 0) + 1;
    });
  });

  renderizarStats(usuariosSnap.size, seriesSnap.size, contagemDistribuidoras);
  renderizarUsuarios(usuariosSnap, seriesPorUsuario);
}

function renderizarStats(totalUsuarios, totalSeries, contagemDistribuidoras) {
  const topDistribuidoras = Object.entries(contagemDistribuidoras)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  statsGridEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-numero">${totalUsuarios}</span>
      <span class="stat-label">Usuários cadastrados</span>
    </div>
    <div class="stat-card">
      <span class="stat-numero">${totalSeries}</span>
      <span class="stat-label">Séries cadastradas (todos)</span>
    </div>
    <div class="stat-card">
      <span class="stat-numero">${topDistribuidoras[0] ? topDistribuidoras[0][0] : "—"}</span>
      <span class="stat-label">Distribuidora mais usada</span>
    </div>
  `;
}

function renderizarUsuarios(usuariosSnap, seriesPorUsuario) {
  if (usuariosSnap.empty) {
    tabelaUsuariosEl.innerHTML = '<p class="vazio">Nenhum usuário cadastrado ainda.</p>';
    return;
  }

  const usuarioAtualUid = auth.currentUser.uid;

  tabelaUsuariosEl.innerHTML = usuariosSnap.docs
    .map((doc) => {
      const dados = doc.data();
      const bloqueado = dados.bloqueado === true;
      const ehVoceMesmo = doc.id === usuarioAtualUid;

      return `
        <div class="usuario-linha">
          <div class="usuario-linha-info">
            <span class="serie-nome">${dados.email || "(sem e-mail)"}</span>
            <span class="serie-meta">
              Cadastrado em ${formatarData(dados.criadoEm)} · ${seriesPorUsuario[doc.id] || 0} séries
              <span class="badge ${bloqueado ? "cancelada" : "completa"}">${bloqueado ? "Bloqueado" : "Ativo"}</span>
            </span>
            <span class="serie-meta">Último acesso: ${formatarDataHora(dados.ultimoAcesso)}</span>
          </div>
          <button
            type="button"
            class="btn-bloquear"
            data-uid="${doc.id}"
            data-bloqueado="${bloqueado}"
            ${ehVoceMesmo ? "disabled title=\"Você não pode bloquear sua própria conta\"" : ""}
          >
            ${bloqueado ? "Desbloquear" : "Bloquear"}
          </button>
        </div>
      `;
    })
    .join("");

  tabelaUsuariosEl.querySelectorAll(".btn-bloquear").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const uid = botao.dataset.uid;
      const bloqueadoAtual = botao.dataset.bloqueado === "true";
      botao.disabled = true;
      await db.collection("usuarios").doc(uid).update({ bloqueado: !bloqueadoAtual });
      await carregarDadosAdmin();
    });
  });
}

auth.onAuthStateChanged(async (usuario) => {
  telaCarregandoEl.hidden = true;

  if (!usuario) {
    window.location.href = "index.html";
    return;
  }

  if (usuario.email !== ADMIN_EMAIL) {
    telaNegadoEl.hidden = false;
    return;
  }

  usuarioEmailEl.textContent = usuario.email;
  adminContainerEl.hidden = false;
  carregarDadosAdmin();
});

document.getElementById("btn-sair").addEventListener("click", () => {
  auth.signOut();
});
