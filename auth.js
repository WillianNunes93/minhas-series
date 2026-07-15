firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let souAdmin = false;

const telaLoginEl = document.getElementById("tela-login");
const appContainerEl = document.getElementById("app-container");
const authErroEl = document.getElementById("auth-erro");
const authEmailEl = document.getElementById("auth-email");
const authSenhaEl = document.getElementById("auth-senha");

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

async function garantirPerfilUsuario(usuario) {
  const perfilRef = db.collection("usuarios").doc(usuario.uid);
  const perfil = await perfilRef.get();
  if (!perfil.exists) {
    await perfilRef.set({
      email: usuario.email,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      bloqueado: false,
      nomeExibicao: usuario.email.split("@")[0],
      avatar: AVATAR_PADRAO,
      distribuidorasFavoritas: [],
    });
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

    telaLoginEl.hidden = true;
    appContainerEl.hidden = false;
    document.getElementById("link-admin").hidden = !souAdmin;
    iniciarListenerSeries(db, usuario.uid);
    iniciarListenerNotificacoes(db, usuario.uid);
    iniciarListenerAtividades(db, usuario.uid);
    iniciarListenerPerfil(db, usuario.uid);

    setTimeout(() => verificarRenovacoesAutomaticamente(), 3000);
  } else {
    telaLoginEl.hidden = false;
    appContainerEl.hidden = true;
    pararListenerSeries();
    pararListenerNotificacoes();
    pararListenerAtividades();
    pararListenerPerfil();
  }
});

document.getElementById("btn-auth-entrar").addEventListener("click", async () => {
  authErroEl.hidden = true;
  try {
    await auth.signInWithEmailAndPassword(authEmailEl.value.trim(), authSenhaEl.value);
  } catch (erro) {
    mostrarErroAuth(erro);
  }
});

document.getElementById("btn-auth-cadastrar").addEventListener("click", async () => {
  authErroEl.hidden = true;
  try {
    await auth.createUserWithEmailAndPassword(authEmailEl.value.trim(), authSenhaEl.value);
  } catch (erro) {
    mostrarErroAuth(erro);
  }
});

document.getElementById("btn-sair").addEventListener("click", () => {
  auth.signOut();
});
