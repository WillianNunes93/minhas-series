firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const telaLoginEl = document.getElementById("tela-login");
const appContainerEl = document.getElementById("app-container");
const usuarioEmailEl = document.getElementById("usuario-email");
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

auth.onAuthStateChanged((usuario) => {
  if (usuario) {
    telaLoginEl.hidden = true;
    appContainerEl.hidden = false;
    usuarioEmailEl.textContent = usuario.email;
    iniciarListenerSeries(db, usuario.uid);
  } else {
    telaLoginEl.hidden = false;
    appContainerEl.hidden = true;
    pararListenerSeries();
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
