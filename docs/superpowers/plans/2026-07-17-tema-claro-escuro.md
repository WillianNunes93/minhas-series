# Tema claro/escuro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um sistema de tema claro/escuro ao app "Minhas Séries" — paleta clara completa, detecção automática da preferência do sistema no primeiro carregamento, e um botão de sol/lua para alternar manualmente, com a escolha lembrada só neste navegador.

**Architecture:** Um atributo `data-tema` (`"claro"` ou `"escuro"`) no elemento `<html>` controla qual bloco de variáveis CSS (`:root` vs `:root[data-tema="claro"]`) fica ativo. Um script inline no `<head>` decide o valor inicial (síncrono, antes da primeira pintura, pra não ter flash de tema errado). Um novo arquivo `tema.js` cuida só do clique no botão de alternar, salvando a escolha em `localStorage`.

**Tech Stack:** HTML/CSS/JS puro (sem framework, sem bundler), mesmo padrão dos outros arquivos do projeto (`notificacoes-locais.js`, `verificar-atualizacao.js`).

## Global Constraints

- Não existe suíte de testes automatizada neste projeto — toda verificação é manual, abrindo o app no navegador (localmente via `npx serve minhas-series` ou o preview já configurado) e inspecionando visualmente / via console do DevTools.
- Nomes de função e variável em português, seguindo o padrão do resto do código (`const xEl = document.getElementById(...)`, funções em camelCase português).
- O tema escuro atual (`:root` sem atributo) não pode mudar visualmente em nada — é o fallback de segurança e o comportamento padrão de hoje.
- A escolha de tema fica só em `localStorage` (chave `"temaPreferido"`, valores `"claro"`/`"escuro"`) — não sincroniza com o Firestore.
- Não alterar layout, espaçamento ou estrutura de nenhuma tela nesta etapa — só cores. (O redesign visual é um projeto separado, posterior.)
- Spec de referência: `docs/superpowers/specs/2026-07-17-tema-claro-escuro-design.md`.

---

### Task 1: Paleta clara + detecção automática do tema (sem botão ainda)

**Files:**
- Modify: `style.css:1-15` (bloco `:root` existente)
- Modify: `index.html` (`<head>`, entre `<meta charset="UTF-8">` e o `<link rel="preconnect"...>` seguinte)

**Interfaces:**
- Produces: atributo `data-tema` em `document.documentElement`, com valor `"claro"` ou `"escuro"` já definido antes da primeira pintura da página. Tarefas seguintes (Task 2, Task 3) dependem desse atributo já existir e já ter um valor.

- [ ] **Step 1: Adicionar o bloco de variáveis do tema claro em `style.css`**

Logo depois do bloco `:root { ... }` existente (linha 15, `}`), adicionar:

```css
:root[data-tema="claro"] {
  --cor-fundo: #f7f6fc;
  --cor-card: #ffffff;
  --cor-card-alt: #eeecf9;
  --cor-borda: #e2e0ee;
  --cor-texto: #1a1b26;
  --cor-texto-fraco: #6b6e82;
  --cor-destaque: #7c3aed;
  --cor-destaque-hover: #6d28d9;
  --cor-marca: #7c3aed;
  --cor-positivo: #1e9e5a;
  --cor-informativo: #1f7bbf;
  --cor-atencao: #b8790a;
  --cor-alerta: #d33a2c;
}
```

- [ ] **Step 2: Adicionar o script de detecção inicial no `<head>` de `index.html`**

Logo depois de `<meta charset="UTF-8">` (antes do `<meta name="viewport"...>` ou logo depois — só precisa vir antes do `<link rel="stylesheet" href="style.css">`), adicionar:

```html
<script>
  (function () {
    var salvo = localStorage.getItem("temaPreferido");
    var tema = salvo || (window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro");
    document.documentElement.setAttribute("data-tema", tema);
  })();
</script>
```

Este script fica inline (não em arquivo separado) de propósito — precisa rodar de forma síncrona e bloqueante antes do CSS ser aplicado, senão a página pisca com o tema errado por uma fração de segundo antes de corrigir.

- [ ] **Step 3: Verificar manualmente**

Abrir o app no navegador (`npx serve minhas-series` ou o preview já configurado no projeto, porta 5522) e no console do DevTools rodar, um de cada vez:

```js
localStorage.setItem("temaPreferido", "claro");
location.reload();
```
Expected: depois do reload, `document.documentElement.getAttribute("data-tema")` retorna `"claro"`, e o fundo da página já está claro (mesmo antes de qualquer botão existir — pode confirmar rodando `getComputedStyle(document.body).backgroundColor` e comparando com o valor antes/depois).

```js
localStorage.removeItem("temaPreferido");
location.reload();
```
Expected: `document.documentElement.getAttribute("data-tema")` volta a refletir a preferência do sistema operacional/navegador (testar com o DevTools → aba Rendering → "Emulate CSS media feature prefers-color-scheme" alternando entre `light` e `dark`, recarregando a cada mudança).

- [ ] **Step 4: Commit**

```bash
git add style.css index.html
git commit -m "Adiciona paleta clara e deteccao automatica de tema"
```

---

### Task 2: Corrigir exceções de contraste no tema claro

**Files:**
- Modify: `style.css:41-50` (gradiente do título do header)
- Modify: `style.css:1794-1818` (cores dos badges de status e do select de status)

**Interfaces:**
- Consumes: `data-tema="claro"` (produzido pela Task 1) já aplicado em `document.documentElement`.
- Produces: nenhuma interface nova — só ajustes visuais que a Task 4 vai verificar como parte da passada completa.

- [ ] **Step 1: Corrigir o gradiente do título do header pro tema claro**

O bloco atual (`style.css:41-50`):
```css
header h1 {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff, #b8a6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```
usa um gradiente claro (`#fff` → `#b8a6ff`) com `background-clip: text`, o que só é legível sobre o fundo escuro atual. Adicionar logo depois desse bloco (antes de `header h1 .emoji`):
```css
:root[data-tema="claro"] header h1 {
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
}
```

- [ ] **Step 2: Trocar as cores fixas dos badges de status por variáveis**

Em `style.css:1794-1818`, o bloco atual é:
```css
.badge.quero-assistir { color: #f1c40f; border-color: rgba(241, 196, 15, 0.4); }
.badge.assistindo { color: #3498db; border-color: rgba(52, 152, 219, 0.4); }
.badge.pausada { color: #f39c12; border-color: rgba(243, 156, 18, 0.4); }
.badge.completa { color: #2ecc71; border-color: rgba(46, 204, 113, 0.4); }
.badge.abandonada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }
.badge.cancelada { color: #e74c3c; border-color: #e74c3c; }
.badge.confirmada { color: #2ecc71; border-color: rgba(46, 204, 113, 0.4); }
.badge.em-exibicao { color: #3498db; border-color: rgba(52, 152, 219, 0.4); }
.badge.sem-data { color: #3498db; border-color: rgba(52, 152, 219, 0.4); }
.badge.encerrada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }

.select-status.status-quero-assistir { color: #f1c40f; border-color: rgba(241, 196, 15, 0.4); }
.select-status.status-assistindo { color: #3498db; border-color: rgba(52, 152, 219, 0.4); }
.select-status.status-pausada { color: #f39c12; border-color: rgba(243, 156, 18, 0.4); }
.select-status.status-completa { color: #2ecc71; border-color: rgba(46, 204, 113, 0.4); }
.select-status.status-abandonada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }
```
(Confirme os nomes exatos de classe e a ordem lendo o arquivo antes de editar — pode haver pequenas variações de linha desde a spec.) Trocar as cores de `assistindo`/`sem-data`/`em-exibicao`/`confirmada` (azul e verde) por `var(--cor-informativo)` e `var(--cor-positivo)`, `quero-assistir`/`pausada` (amarelo/laranja) por `var(--cor-atencao)`, `abandonada`/`encerrada` (cinza) mantém `#7f8c8d` fixo (é neutro, funciona em ambos os temas, não está na paleta de variáveis), e `cancelada` (vermelho) por `var(--cor-alerta)`:
```css
.badge.quero-assistir { color: var(--cor-atencao); border-color: rgba(184, 121, 10, 0.35); }
.badge.assistindo { color: var(--cor-informativo); border-color: rgba(31, 123, 191, 0.35); }
.badge.pausada { color: var(--cor-atencao); border-color: rgba(184, 121, 10, 0.35); }
.badge.completa { color: var(--cor-positivo); border-color: rgba(30, 158, 90, 0.35); }
.badge.abandonada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }
.badge.cancelada { color: var(--cor-alerta); border-color: var(--cor-alerta); }
.badge.confirmada { color: var(--cor-positivo); border-color: rgba(30, 158, 90, 0.35); }
.badge.em-exibicao { color: var(--cor-informativo); border-color: rgba(31, 123, 191, 0.35); }
.badge.sem-data { color: var(--cor-informativo); border-color: rgba(31, 123, 191, 0.35); }
.badge.encerrada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }

.select-status.status-quero-assistir { color: var(--cor-atencao); border-color: rgba(184, 121, 10, 0.35); }
.select-status.status-assistindo { color: var(--cor-informativo); border-color: rgba(31, 123, 191, 0.35); }
.select-status.status-pausada { color: var(--cor-atencao); border-color: rgba(184, 121, 10, 0.35); }
.select-status.status-completa { color: var(--cor-positivo); border-color: rgba(30, 158, 90, 0.35); }
.select-status.status-abandonada { color: #7f8c8d; border-color: rgba(127, 140, 141, 0.4); }
```
Isso faz essas cores automaticamente ficarem mais escuras/legíveis no tema claro (porque `--cor-atencao`/`--cor-informativo`/`--cor-positivo`/`--cor-alerta` já são redefinidas mais escuras dentro de `:root[data-tema="claro"]` na Task 1) sem precisar duplicar essas ~15 regras dentro de um bloco `[data-tema="claro"]` separado.

- [ ] **Step 3: Verificar manualmente**

No console do DevTools, forçar o tema claro sem precisar de botão:
```js
document.documentElement.setAttribute("data-tema", "claro");
```
Expected: o título "📺 Minhas Séries" no topo continua legível (roxo escuro sobre fundo claro, não mais branco quase invisível). Navegar até a aba "Minha Lista" (tem séries com status variados) e conferir que os badges de status (ex: "Assistindo", "Completa", "Cancelada") têm cor de texto visivelmente diferente do fundo branco do card — nenhum badge deve ficar "lavado"/ilegível.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "Corrige contraste do titulo e dos badges de status no tema claro"
```

---

### Task 3: Botão de alternar tema

**Files:**
- Create: `tema.js`
- Modify: `index.html` (markup do botão dentro de `.usuario-barra`, e a tag `<script src="tema.js">`)
- Modify: `style.css` (reaproveitar o estilo circular já existente do `.btn-notificacoes` também para o novo botão)

**Interfaces:**
- Consumes: atributo `data-tema` em `document.documentElement` (produzido pela Task 1).
- Produces: botão `#btn-tema` clicável que alterna `data-tema` entre `"claro"`/`"escuro"`, persiste em `localStorage["temaPreferido"]`, e atualiza seu próprio ícone (☀️/🌙) — nenhuma tarefa futura depende disso além da verificação final (Task 4).

- [ ] **Step 1: Adicionar o botão no HTML**

Em `index.html`, dentro de `.usuario-barra` (ao lado do `.notificacoes-wrap`, antes ou depois — a ordem visual não importa, mas manter perto do sino de notificações):
```html
<button type="button" id="btn-tema" class="btn-notificacoes" aria-label="Alternar tema claro/escuro">🌙</button>
```
Reaproveita a classe `.btn-notificacoes` já existente (botão circular com borda, 34x34px) — o ícone inicial no HTML estático não importa, é sobrescrito por `tema.js` assim que a página carrega.

- [ ] **Step 2: Adicionar a tag do script novo**

Em `index.html`, no fim do `<body>`, adicionar `<script src="tema.js"></script>` como a **primeira** linha da lista de scripts (antes de `firebase-app-compat.js`), já que `tema.js` não depende de Firebase nem de nenhum outro arquivo do projeto.

- [ ] **Step 3: Criar `tema.js`**

```js
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
```

- [ ] **Step 4: Verificar manualmente**

Recarregar o app no navegador. No console do DevTools:
```js
document.getElementById("btn-tema").textContent;
```
Expected: `"🌙"` — o app abre no tema escuro por padrão (sem nenhuma preferência salva ainda), e `aplicarIconeTema()` mostra o ícone do tema **atual** (lua quando está escuro, sol quando está claro), não do tema de destino.

Clicar no botão (`document.getElementById("btn-tema").click()` ou clicar de verdade na tela). Expected: o fundo, texto e cards de toda a tela visível mudam de cor instantaneamente (não só o botão), e `document.documentElement.getAttribute("data-tema")` reflete o novo valor.

Recarregar a página sem mexer em mais nada. Expected: o tema escolhido no clique anterior continua (persistiu via `localStorage`), mesmo que seja diferente da preferência do sistema operacional.

- [ ] **Step 5: Commit**

```bash
git add tema.js index.html
git commit -m "Adiciona botao de alternar entre tema claro e escuro"
```

---

### Task 4: Verificação completa em todas as telas, nos dois temas

**Files:**
- Modify (só se algum problema for encontrado): `style.css`

**Interfaces:**
- Consumes: tudo produzido pelas Tasks 1-3 (paleta clara, atributo `data-tema`, botão funcional).
- Produces: nenhuma interface nova — esta é a verificação final de ponta a ponta antes de considerar a feature pronta.

- [ ] **Step 1: Passar por cada aba nos dois temas**

Com o app aberto e logado, clicar no botão de tema pra alternar entre claro/escuro em cada uma das telas abaixo, conferindo legibilidade de texto, contraste dos badges/status, e se algum elemento ficou com cor de fundo igual à cor de texto (invisível):
- Dashboard (`data-tab="dashboard"`)
- Consultar (`data-tab="consultar"`, incluindo os cards de resultado de busca e o formulário de adicionar série)
- Minha Lista (`data-tab="lista"`, incluindo o grid de séries com badges de status variados)
- Timeline (`data-tab="timeline"`)
- Estatísticas (`data-tab="estatisticas"`)
- Amigos (`data-tab="amigos"`, incluindo o painel completo do amigo — botão "Ver perfil completo" — que usa os mesmos badges de status)
- Discovery (`data-tab="discovery"`)
- Modal de Perfil (botão `#btn-perfil`)
- Modal de Episódios (botão "📺 Episódios" em qualquer card de série com temporadas)

- [ ] **Step 2: Verificar ausência de flash de tema errado**

Com o tema claro escolhido (persistido via clique anterior), forçar o sistema operacional/navegador para modo escuro (DevTools → Rendering → `prefers-color-scheme: dark`) e recarregar a página várias vezes seguidas, observando atentamente o instante do carregamento. Expected: a página aparece diretamente no tema claro (a escolha salva), sem um instante visível de tema escuro antes de corrigir.

- [ ] **Step 3: Corrigir qualquer problema de contraste encontrado**

Se algum ponto do Step 1 mostrar texto ilegível ou baixo contraste no tema claro, corrigir seguindo o mesmo padrão das Tasks 1-2: preferir trocar uma cor fixa por uma `var(--cor-*)` já existente; só criar uma regra nova sob `:root[data-tema="claro"] seletor-especifico { ... }` se não houver variável adequada.

- [ ] **Step 4: Confirmar que o tema escuro continua idêntico ao comportamento anterior**

Com `data-tema="escuro"` (ou o atributo removido), comparar visualmente com uma captura de tela do app antes desta feature (ou apenas confirmar que nada no `:root` original foi alterado, só o bloco `:root[data-tema="claro"]` foi adicionado por cima) — nenhuma cor do tema escuro deve ter mudado.

- [ ] **Step 5: Commit (se houve correções no Step 3)**

```bash
git add style.css
git commit -m "Corrige contraste adicional encontrado na verificacao final do tema claro"
```

Se nenhuma correção foi necessária, não há commit neste step — a feature já está completa ao final da Task 3.
