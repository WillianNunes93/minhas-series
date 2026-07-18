const CHAVE_TEMA_LOCALSTORAGE = "temaPreferido";
const btnTemaEl = document.getElementById("btn-tema");

function temaAtual() {
  return document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
}

function aplicarIconeTema() {
  btnTemaEl.textContent = temaAtual() === "claro" ? "☀️" : "🌙";
}

function alternarTema() {
  const novoTema = temaAtual() === "claro" ? "escuro" : "claro";
  document.documentElement.setAttribute("data-tema", novoTema);
  localStorage.setItem(CHAVE_TEMA_LOCALSTORAGE, novoTema);
  aplicarIconeTema();
}

aplicarIconeTema();
btnTemaEl.addEventListener("click", alternarTema);
