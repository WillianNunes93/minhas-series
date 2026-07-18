# Redesign visual da navegação (parte B, sprint 1) — design

## Contexto

O pedido original era redesenhar toda a navegação e todas as telas do app
pra deixar a jornada mobile "o mais bonito possível", junto com o modo
claro/escuro. O tema já foi implementado (ver
`2026-07-17-tema-claro-escuro-design.md`). Esta spec cobre a **primeira
etapa do redesign visual**: a navegação (barra inferior no mobile, barra do
topo, e a transição entre abas) — a base compartilhada que aparece em toda
tela e mais define a "sensação" do app. As 7 telas individuais (Dashboard,
Consultar, Minha Lista, Timeline, Estatísticas, Amigos, Discovery) ficam
para sprints seguintes, cada uma com sua própria spec.

Decisões já validadas com o usuário:
- Começar pela navegação, não por uma tela específica.
- Refinar o estilo visual atual (paleta roxa, cards, cantos arredondados) —
  sem reformulação ousada. A escala de decisão do usuário sempre foi
  sprint a sprint, então este documento cobre só a navegação.
- Não mexer na sidebar de desktop nesta etapa — foco é a jornada mobile
  (a sidebar só aparece acima de 900px de largura, `style.css:453`).
- Não mexer na decisão já tomada de "barra rolável com 7 itens" em vez de
  esconder itens atrás de um botão "Mais" (comentário existente em
  `style.css:486-487` documentando essa escolha anterior).

## Arquitetura

Três mudanças independentes, todas só de CSS (mais uma pequena adição de
`@keyframes`) — nenhuma mudança de estrutura HTML ou de lógica JS é
necessária, porque `mudarTab()` (`script.js:77-82`) já faz `elemento.hidden
= nome !== nomeTab`; remover o atributo `hidden` de um elemento já dispara
qualquer `animation` CSS declarada nele, então a transição de entrada
funciona só com CSS, sem tocar em `script.js`.

### 1. Barra inferior (mobile) — `@media (max-width: 900px)`, `style.css:471-550`

- **Fundo com desfoque (glass sutil)**: trocar o fundo sólido
  `linear-gradient(180deg, var(--cor-card), var(--cor-card-alt))` por uma
  versão semi-transparente usando `color-mix()` (suportado nos navegadores
  modernos, adequado pra um app de uso familiar), mais
  `backdrop-filter: blur(12px)` (com prefixo `-webkit-` pra Safari/iOS).
- **Indicador de aba ativa em formato de "pílula"**: `.bottom-nav-btn.ativa`
  hoje é só `background: rgba(139, 92, 246, 0.15)` (cor fixa, não usa
  variável). Trocar pela mesma ideia via `color-mix(in srgb, var(--cor-destaque) 18%, transparent)`,
  mantendo o `border-radius: 12px` que o botão já tem (`style.css:500`), e
  adicionar um anel sutil (`box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cor-destaque) 30%, transparent)`)
  pra dar mais definição de forma.
- **Botão central "Início" com mais destaque**: aumentar um pouco o brilho
  do `box-shadow` atual (`0 8px 20px -6px rgba(139, 92, 246, 0.7)` →
  `0 10px 26px -6px rgba(139, 92, 246, 0.85)`). Manter o tamanho (52px)
  como está — só o brilho muda.
- **Feedback tátil ao tocar**: adicionar `.bottom-nav-btn:active { transform: scale(0.92); }`
  com `transition: transform 0.15s ease` em `.bottom-nav-btn` — dá a
  sensação de "afundar" ao tocar, comum em apps nativos, sem precisar de
  JS.

### 2. Barra do topo (`.usuario-barra`, `style.css:153-161`)

Hoje rola junto com o conteúdo (sem `position`, sem fundo). Passa a ficar
fixa no topo com o mesmo tratamento de desfoque da barra inferior:
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
}
```
(O ajuste de `padding`/`margin` compensa o `padding: 0 1.25rem` que
`#app-container` já aplica, `style.css:371`, pra a barra esticar de ponta a
ponta atrás do conteúdo quando fixa — needs verifying visually durante a
implementação, ajustar se sobrar/faltar espaço.) Não há nenhum ancestral
com `overflow: hidden/scroll` entre `.usuario-barra` e o topo da página
(confirmado lendo `#app-container`/`.conteudo-app`/`main` em
`style.css:365-383`), então `position: sticky` funciona sem mudança
estrutural.

### 3. Transição entre abas (novo, todas as larguras de tela)

Nova regra global, aplicada a `.painel-tab` (a classe que toda seção de aba
já tem — confirmado em `index.html`, ex. `id="painel-lista"` linha 231,
`id="painel-amigos"` linha 273):
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
Isso cobre tanto a troca de aba pelo usuário quanto o carregamento inicial
da página (a primeira aba visível também recebe o fade sutil, o que é
aceitável e comum). A regra `prefers-reduced-motion` respeita quem
desativou animações no sistema — um cuidado de acessibilidade barato de
incluir.

## Fora de escopo (fica pra próximas etapas)

- Redesign de qualquer tela individual (Dashboard, Consultar, Lista,
  Timeline, Estatísticas, Amigos, Discovery) — sprints separados.
- Sidebar de desktop.
- Qualquer mudança em `script.js` (`mudarTab()` continua exatamente como
  está).
- Suporte a navegadores antigos sem `color-mix()`/`backdrop-filter` — dado
  o uso familiar/pessoal do app, navegadores modernos são assumidos (mesma
  postura já adotada no restante do projeto).

## Verificação (manual, no navegador — sem suíte de testes automatizada)

1. No mobile (viewport estreito), a barra inferior mostra o desfoque atrás
   dela quando há conteúdo rolando por baixo, nos dois temas (claro e
   escuro).
2. A aba ativa aparece como uma pílula com fundo roxo translúcido e um anel
   sutil, distinguível das abas inativas.
3. O botão central "Início" tem um brilho mais evidente que antes.
4. Tocar em qualquer botão da barra inferior dá um feedback visual de
   "afundar" (escala reduzida) e volta ao normal ao soltar.
5. A barra do topo fica fixa ao rolar a tela, com o mesmo desfoque, em
   qualquer aba.
6. Trocar de aba mostra um fade + leve deslize pra cima na tela nova, nos
   dois temas, sem atraso perceptível na resposta ao clique.
7. Com `prefers-reduced-motion: reduce` ativado (emulável via DevTools), a
   troca de aba acontece sem animação.
8. Regressão: a sidebar de desktop (acima de 900px) continua exatamente
   como está; a barra inferior continua rolando horizontalmente com os 7
   itens sem esconder nenhum atrás de "Mais".
