firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let souAdmin = false;

const telaLoginEl = document.getElementById("tela-login");
const appContainerEl = document.getElementById("app-container");
const authErroEl = document.getElementById("auth-erro");
const authTituloEl = document.getElementById("auth-titulo");
const authEmailEl = document.getElementById("auth-email");
const authSenhaEl = document.getElementById("auth-senha");
const authNomeEl = document.getElementById("auth-nome");
const authConfirmarSenhaEl = document.getElementById("auth-confirmar-senha");
const campoNomeUsuarioEl = document.getElementById("campo-nome-usuario");
const campoConfirmarSenhaEl = document.getElementById("campo-confirmar-senha");
const btnAuthEntrarEl = document.getElementById("btn-auth-entrar");
const btnAuthCadastrarEl = document.getElementById("btn-auth-cadastrar");

const mensagensErroAuth = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-not-found": "Usuário não encontrado.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Esse e-mail já tem uma conta. Tente entrar.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
};

function mostrarErroAuth(erro) {
  authErroEl.textContent = mensagensErroAuth[erro.code] || "Ocorreu um erro. Tente novamente.";
  authErroEl.hidden = false;
}

function mostrarErroAuthTexto(texto) {
  authErroEl.textContent = texto;
  authErroEl.hidden = false;
}

// Guardado aqui (em vez de ser escrito direto pelo cadastro) para que só
// garantirPerfilUsuario grave o documento inicial do perfil — evita uma
// condição de corrida entre esse fluxo e o cadastro escrevendo ao mesmo tempo.
let nomeCadastroPendente = null;

let modoCadastro = false;

function atualizarModoAuth() {
  authTituloEl.textContent = modoCadastro ? "Criar conta" : "Entrar";
  campoNomeUsuarioEl.hidden = !modoCadastro;
  campoConfirmarSenhaEl.hidden = !modoCadastro;
  btnAuthEntrarEl.textContent = modoCadastro ? "Criar conta" : "Entrar";
  btnAuthCadastrarEl.textContent = modoCadastro ? "Já tenho conta" : "Criar conta";
  authErroEl.hidden = true;
}

async function garantirPerfilUsuario(usuario) {
  const perfilRef = db.collection("usuarios").doc(usuario.uid);
  const perfil = await perfilRef.get();
  if (!perfil.exists) {
    await perfilRef.set({
      email: usuario.email,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      bloqueado: false,
      nomeExibicao: nomeCadastroPendente || usuario.email.split("@")[0],
      avatar: AVATAR_PADRAO,
      distribuidorasFavoritas: [],
    });
    nomeCadastroPendente = null;
    return false;
  }
  return perfil.data().bloqueado === true;
}

auth.onAuthStateChanged(async (usuario) => {
  if (usuario) {
    const bloqueado = await garantirPerfilUsuario(usuario);
    if (bloqueado) {
      await auth.signOut();
      authErroEl.textContent = "Sua conta foi bloqueada. Fale com o administrador.";
      authErroEl.hidden = false;
      return;
    }

    souAdmin = usuario.email === ADMIN_EMAIL;

    db.collection("usuarios").doc(usuario.uid).update({
      ultimoAcesso: firebase.firestore.FieldValue.serverTimestamp(),
    });

    telaLoginEl.hidden = true;
    appContainerEl.hidden = false;
    iniciarListenerSeries(db, usuario.uid);
    iniciarListenerNotificacoes(db, usuario.uid);
    iniciarListenerAtividades(db, usuario.uid);
    iniciarListenerPerfil(db, usuario.uid);
    iniciarListenersAmizade(db, usuario.uid);
    iniciarListenerIndicacoes(db, usuario.uid);

    setTimeout(() => verificarRenovacoesAutomaticamente(), 3000);
  } else {
    telaLoginEl.hidden = false;
    appContainerEl.hidden = true;
    pararListenerSeries();
    pararListenerNotificacoes();
    pararListenerAtividades();
    pararListenerPerfil();
    pararListenersAmizade();
    pararListenerIndicacoes();
  }
});

btnAuthEntrarEl.addEventListener("click", async () => {
  authErroEl.hidden = true;

  if (modoCadastro) {
    const nome = authNomeEl.value.trim();
    const senha = authSenhaEl.value;

    if (!nome) {
      mostrarErroAuthTexto("Escolha um nome de usuário.");
      return;
    }
    if (senha !== authConfirmarSenhaEl.value) {
      mostrarErroAuthTexto("As senhas não coincidem.");
      return;
    }

    nomeCadastroPendente = nome;
    try {
      await auth.createUserWithEmailAndPassword(authEmailEl.value.trim(), senha);
    } catch (erro) {
      nomeCadastroPendente = null;
      mostrarErroAuth(erro);
    }
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(authEmailEl.value.trim(), authSenhaEl.value);
  } catch (erro) {
    mostrarErroAuth(erro);
  }
});

btnAuthCadastrarEl.addEventListener("click", () => {
  modoCadastro = !modoCadastro;
  atualizarModoAuth();
});
