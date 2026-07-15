const modalIndicarEl = document.getElementById("modal-indicar");
const modalIndicarCorpoEl = document.getElementById("modal-indicar-corpo");
const btnFecharIndicarEl = document.getElementById("btn-fechar-indicar");
const indicacoesRecebidasSecaoEl = document.getElementById("indicacoes-recebidas-secao");

let indicacoesRef = null;
let unsubscribeIndicacoesRecebidas = null;
let indicacoesRecebidas = [];
let serieParaIndicar = null;

function iniciarListenerIndicacoes(db, uid) {
  indicacoesRef = db.collection("indicacoes");
  unsubscribeIndicacoesRecebidas = indicacoesRef
    .where("destinatario", "==", uid)
    .onSnapshot((snapshot) => {
      indicacoesRecebidas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderizarIndicacoesRecebidas();
    });
}

function pararListenerIndicacoes() {
  if (unsubscribeIndicacoesRecebidas) unsubscribeIndicacoesRecebidas();
  indicacoesRef = null;
  indicacoesRecebidas = [];
}

function abrirModalIndicar(serieId) {
  const serie = series.find((s) => s.id === serieId);
  if (!serie) return;

  serieParaIndicar = serie;
  renderModalIndicar();
  modalIndicarEl.hidden = false;
}

function fecharModalIndicar() {
  modalIndicarEl.hidden = true;
  serieParaIndicar = null;
}

function renderModalIndicar() {
  if (amigosAceitos.length === 0) {
    modalIndicarCorpoEl.innerHTML = `
      <h2>Indicar série</h2>
      <p class="vazio">Você ainda não tem amigos adicionados. Adicione um na aba Amigos primeiro.</p>
    `;
    return;
  }

  const amigosHtml = amigosAceitos
    .map(
      (amigo) => `
        <div class="amigo-item">
          <span class="perfil-avatar-barra">${amigo.avatar || AVATAR_PADRAO}</span>
          <span class="amigo-nome">${escapeHtml(amigo.nomeExibicao)}</span>
          <button type="button" data-indicar-para="${amigo.uid}">Indicar</button>
        </div>
      `
    )
    .join("");

  modalIndicarCorpoEl.innerHTML = `
    <h2>Indicar "${escapeHtml(serieParaIndicar.nome)}"</h2>
    <p class="serie-meta">Escolha para qual amigo você quer indicar essa série.</p>
    ${amigosHtml}
  `;
}

async function enviarIndicacao(amigoUid) {
  const amigo = amigosAceitos.find((a) => a.uid === amigoUid);
  if (!amigo || !serieParaIndicar) return;

  await indicacoesRef.add({
    remetente: auth.currentUser.uid,
    destinatario: amigoUid,
    remetenteNome: (perfilUsuario && perfilUsuario.nomeExibicao) || auth.currentUser.email.split("@")[0],
    remetenteAvatar: (perfilUsuario && perfilUsuario.avatar) || AVATAR_PADRAO,
    serieTmdbId: serieParaIndicar.tmdbId,
    serieNome: serieParaIndicar.nome,
    seriePosterPath: serieParaIndicar.poster ? serieParaIndicar.poster.replace(TMDB_IMG, "") : null,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });

  modalIndicarCorpoEl.innerHTML = `
    <h2>Indicar "${escapeHtml(serieParaIndicar.nome)}"</h2>
    <p class="vazio">Indicação enviada para ${escapeHtml(amigo.nomeExibicao)}!</p>
  `;
}

function IndicacaoRecebidaItem(indicacao) {
  const poster = indicacao.seriePosterPath
    ? `<img src="${TMDB_IMG}${indicacao.seriePosterPath}" alt="">`
    : '<div class="poster-vazio-grande">🎬</div>';

  return `
    <div class="amigo-item">
      <div class="amigo-serie-poster indicacao-poster">${poster}</div>
      <span class="amigo-nome">
        <strong>${escapeHtml(indicacao.remetenteNome)}</strong> indicou
        <strong>${escapeHtml(indicacao.serieNome)}</strong>
      </span>
      <div class="amigo-acoes">
        <button type="button" data-adicionar-indicacao="${indicacao.id}">+ Adicionar</button>
        <button type="button" class="btn-secundario" data-dispensar-indicacao="${indicacao.id}">Dispensar</button>
      </div>
    </div>
  `;
}

function renderizarIndicacoesRecebidas() {
  if (indicacoesRecebidas.length === 0) {
    indicacoesRecebidasSecaoEl.innerHTML = "";
    return;
  }

  indicacoesRecebidasSecaoEl.innerHTML = `
    <h3 class="amigos-subtitulo">📬 Indicações de séries</h3>
    ${indicacoesRecebidas.map(IndicacaoRecebidaItem).join("")}
  `;
}

async function adicionarIndicacaoNaLista(id) {
  const indicacao = indicacoesRecebidas.find((i) => i.id === id);
  if (!indicacao) return;

  mudarTab("consultar");

  await selecionarResultado({
    id: indicacao.serieTmdbId,
    name: indicacao.serieNome,
    poster_path: indicacao.seriePosterPath,
  });

  await indicacoesRef.doc(id).delete();
}

async function dispensarIndicacao(id) {
  await indicacoesRef.doc(id).delete();
}

btnFecharIndicarEl.addEventListener("click", fecharModalIndicar);

modalIndicarEl.addEventListener("click", (evento) => {
  if (evento.target === modalIndicarEl) fecharModalIndicar();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalIndicarEl.hidden) fecharModalIndicar();
});

modalIndicarCorpoEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-indicar-para]");
  if (!botao) return;
  enviarIndicacao(botao.dataset.indicarPara);
});

indicacoesRecebidasSecaoEl.addEventListener("click", (evento) => {
  const botaoAdicionar = evento.target.closest("[data-adicionar-indicacao]");
  if (botaoAdicionar) {
    adicionarIndicacaoNaLista(botaoAdicionar.dataset.adicionarIndicacao);
    return;
  }

  const botaoDispensar = evento.target.closest("[data-dispensar-indicacao]");
  if (botaoDispensar) {
    dispensarIndicacao(botaoDispensar.dataset.dispensarIndicacao);
  }
});
