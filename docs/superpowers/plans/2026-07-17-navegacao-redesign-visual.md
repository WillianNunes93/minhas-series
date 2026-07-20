# Redesign visual da navegação (sprint 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar visualmente a navegação do app "Minhas Séries" — barra inferior (mobile), barra do topo, e a transição entre abas — sem mudar layout, estrutura ou comportamento, só polimento visual.

**Architecture:** Três blocos de CSS independentes em `style.css`, nenhuma mudança de HTML ou de `script.js`. `mudarTab()` (`script.js:77-82`) já faz `elemento.hidden = nome !== nomeTab`; remover o atributo `hidden` de um elemento dispara automaticamente qualquer `animation` CSS declarada nele, então a transição de entrada funciona só com CSS.

**Tech Stack:** CSS puro (variáveis já existentes de `--cor-*`, `color-mix()`, `backdrop-filter`), sem build step, sem framework.

## Global Constraints

- Não existe suíte de testes automatizada neste projeto — toda verificação é manual, abrindo o app no navegador e inspecionando visualmente.
- Não mudar nenhuma estrutura HTML nem `script.js` — só `style.css`.
- Não mexer na sidebar de desktop (`@media` acima de 900px) nem na decisão já tomada de barra inferior rolável com 7 itens (sem botão "Mais").
- Assumir navegadores modernos (`color-mix()`, `backdrop-filter`) — mesma postura já adotada no resto do projeto; sem fallback para navegadores antigos.
- Respeitar `prefers-reduced-motion: reduce` para a nova animação de transição de aba.
- Spec de referência: `docs/superpowers/specs/2026-07-17-navegacao-redesign-visual-design.md`.

---

### Task 1: Barra inferior (mobile) — desfoque, pílula ativa, brilho central, feedback ao toque

**Files:**
- Modify: `style.css:471-550` (dentro do bloco `@media (max-width: 900px)`)

**Interfaces:**
- Consumes: variáveis de cor já existentes (`--cor-destaque`, `--cor-card`, `--cor-card-alt`), nenhuma nova.
- Produces: nenhuma interface nova — só aparência visual, verificada manualmente.

- [ ] **Step 1: Fundo com desfoque na `.bottom-nav`**

Trocar (`style.css:471-484`):
```css
  .bottom-nav {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: linear-gradient(180deg, var(--cor-card), var(--cor-card-alt));
    border-top: 1px solid var(--cor-borda);
    padding: 0.4rem 0.3rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
  }
```
por:
```css
  .bottom-nav {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cor-card) 85%, transparent),
      color-mix(in srgb, var(--cor-card-alt) 85%, transparent)
    );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--cor-borda);
    padding: 0.4rem 0.3rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
  }
```

- [ ] **Step 2: Indicador de aba ativa em formato de "pílula"**

Trocar (`style.css:512-516`):
```css
  .bottom-nav-btn.ativa {
    background: rgba(139, 92, 246, 0.15);
    color: var(--cor-texto);
    border-color: transparent;
  }
```
por:
```css
  .bottom-nav-btn.ativa {
    background: color-mix(in srgb, var(--cor-destaque) 18%, transparent);
    color: var(--cor-texto);
    border-color: transparent;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cor-destaque) 30%, transparent);
  }
```

- [ ] **Step 3: Mais brilho no botão central "Início"**

Trocar (`style.css:538-550`):
```css
  .bottom-nav-central .bottom-nav-icone {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -22px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--cor-destaque), #6d28d9);
    box-shadow: 0 8px 20px -6px rgba(139, 92, 246, 0.7);
    font-size: 1.5rem;
    color: white;
  }
```
por (só a linha do `box-shadow` muda):
```css
  .bottom-nav-central .bottom-nav-icone {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -22px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--cor-destaque), #6d28d9);
    box-shadow: 0 10px 26px -6px rgba(139, 92, 246, 0.85);
    font-size: 1.5rem;
    color: white;
  }
```

- [ ] **Step 4: Feedback tátil ao tocar (escala reduzida)**

Adicionar logo depois da regra `.bottom-nav-btn:hover` (`style.css:506-510`):
```css
  .bottom-nav-btn {
    transition: transform 0.15s ease;
  }

  .bottom-nav-btn:active {
    transform: scale(0.92);
  }
```
(A propriedade `transition` vai numa regra separada `.bottom-nav-btn { }` — não precisa duplicar toda a regra original de `.bottom-nav-btn` em `style.css:488-504`, CSS aceita múltiplas regras pro mesmo seletor.)

- [ ] **Step 5: Verificar manualmente**

Abrir o app no navegador (`npx serve minhas-series` ou o preview já configurado, porta 5522) numa largura de tela ≤900px (ou emular mobile no DevTools). Confirmar:
- A barra inferior mostra o conteúdo por baixo borrado (desfocado) ao rolar a tela, nos dois temas (claro e escuro — usar o botão de sol/lua já existente pra alternar).
- A aba ativa aparece com um fundo roxo translúcido em formato de pílula com uma borda sutil.
- O botão central "Início" tem um brilho mais evidente que antes.
- Tocar (ou clicar, no desktop emulando touch) em qualquer botão da barra reduz levemente de tamanho e volta ao normal.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "Refina visual da barra de navegacao inferior no mobile"
```

---

### Task 2: Barra do topo fixa com desfoque

**Files:**
- Modify: `style.css:153-161` (`.usuario-barra`)

**Interfaces:**
- Consumes: nenhuma interface de outras tasks.
- Produces: nenhuma interface nova.

- [ ] **Step 1: Tornar a barra fixa (sticky) com desfoque**

Trocar (`style.css:153-161`):
```css
.usuario-barra {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.8rem;
  color: var(--cor-texto-fraco);
  font-size: 0.85rem;
}
```
por:
```css
.usuario-barra {
  position: sticky;
  top: 0;
  z-index: 150;
  background: color-mix(in srgb, var(--cor-fundo) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--cor-borda);
  padding: 0.6rem 1.25rem;
  margin: 0 -1.25rem 1rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.8rem;
  color: var(--cor-texto-fraco);
  font-size: 0.85rem;
}
```

Nota: `margin: 0 -1.25rem` compensa o `padding: 0 1.25rem` que `#app-container` aplica (`style.css:365-372`), pra a barra esticar de ponta a ponta atrás do conteúdo enquanto fixa. Não há nenhum ancestral com `overflow: hidden`/`scroll` entre `.usuario-barra` e o topo da página, então `position: sticky` funciona sem mudança estrutural.

- [ ] **Step 2: Verificar manualmente**

Rolar a tela pra baixo em qualquer aba (ex: "Minha Lista" com várias séries, ou "Discovery"). Confirmar:
- A barra do topo (com o avatar/nome, sino de notificações e botão de tema) fica fixa no topo da tela ao rolar, com o conteúdo desfocado passando por baixo.
- A barra estica de ponta a ponta (sem sobra de espaço nas laterais comparado ao conteúdo abaixo dela).
- Isso funciona igual em qualquer aba, já que `.usuario-barra` fica fora de `.painel-tab` (é renderizada uma vez só, fora do `<main>`).

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "Fixa a barra do topo com desfoque ao rolar a tela"
```

---

### Task 3: Transição de fade entre abas

**Files:**
- Modify: `style.css` (nova regra, `.painel-tab` não tem nenhuma regra própria hoje — adicionar em qualquer lugar do arquivo; sugestão: logo antes de `#app-container`, `style.css:365`, já que é uma regra de "shell" do app)

**Interfaces:**
- Consumes: `mudarTab()` (`script.js:77-82`) já remove/adiciona o atributo `hidden` em elementos `.painel-tab` — não precisa de nenhuma mudança nesse arquivo.
- Produces: nenhuma interface nova.

- [ ] **Step 1: Adicionar a animação de entrada**

Adicionar (antes de `#app-container`, `style.css:365`):
```css
@keyframes entrada-aba {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.painel-tab {
  animation: entrada-aba 0.25s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .painel-tab {
    animation: none;
  }
}
```

- [ ] **Step 2: Verificar manualmente**

Trocar de aba (clicando em qualquer item da barra inferior ou lateral). Confirmar:
- A tela nova aparece com um fade suave + leve deslize de baixo pra cima (não instantâneo como antes).
- A resposta ao clique continua imediata — não há atraso perceptível antes da animação começar.
- No DevTools, emular `prefers-reduced-motion: reduce` (aba Rendering) e trocar de aba de novo — a troca deve acontecer sem nenhuma animação.
- O carregamento inicial da página (primeira aba visível) também mostra o fade sutil — isso é esperado, não é um bug.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "Adiciona transicao de fade ao trocar de aba"
```

---

### Task 4: Verificação final e regressão

**Files:**
- Modify (só se algum problema for encontrado): `style.css`

**Interfaces:**
- Consumes: tudo produzido pelas Tasks 1-3.
- Produces: nenhuma — verificação final antes de considerar a etapa pronta.

- [ ] **Step 1: Passar por todas as abas, nos dois temas, em largura mobile**

Repetir a troca de aba em cada uma das 7 abas (Dashboard, Consultar, Minha Lista, Timeline, Estatísticas, Amigos — incluindo abrir "Ver perfil completo" de um amigo — e Discovery), nos temas claro e escuro, confirmando que a transição de fade, a barra inferior e a barra do topo se comportam de forma consistente em todas.

- [ ] **Step 2: Confirmar que a sidebar de desktop não foi afetada, e que a barra do topo funciona bem em qualquer largura**

Alargar a janela (ou usar `resize_window` para uma largura acima de 900px). Confirmar que a sidebar lateral continua exatamente como antes — sem desfoque, sem pílula, sem transição nova (Task 1 é só dentro de `@media (max-width: 900px)`). A Task 2 (barra do topo), por outro lado, é deliberadamente **não** condicionada a essa media query — a barra fixa com desfoque deve aparecer tanto no mobile quanto no desktop, já que a spec não restringe essa parte só ao mobile. Confirmar que isso também fica visualmente bem em telas largas (a barra esticando de ponta a ponta ao lado da sidebar).

- [ ] **Step 3: Confirmar que a barra inferior continua rolável com os 7 itens**

Arrastar a barra inferior horizontalmente — confirmar que todos os 7 itens continuam acessíveis por scroll, sem nenhum escondido atrás de um botão "Mais" (essa decisão de UX não muda nesta etapa).

- [ ] **Step 4: Corrigir qualquer problema encontrado**

Se algo parecer errado visualmente (ex: a barra do topo sobrepor conteúdo de forma estranha, contraste ruim em algum tema), ajustar diretamente em `style.css` seguindo o mesmo padrão das tasks anteriores.

- [ ] **Step 5: Commit (se houve correções no Step 4)**

```bash
git add style.css
git commit -m "Corrige ajustes finais do redesign da navegacao"
```

Se nenhuma correção foi necessária, não há commit neste step — a etapa já está completa ao final da Task 3.
