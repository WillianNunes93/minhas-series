# Tema claro/escuro — design

## Contexto

O app "Minhas Séries" só tem uma paleta de cores hoje, escura, definida como
variáveis CSS em `:root` (`style.css:1-15`). O pedido do usuário foi por um
redesign visual completo da navegação mobile **e** um modo claro/escuro. Como
os dois juntos são grandes demais pra uma spec só, foram divididos em duas
etapas (ver memória do projeto): esta spec cobre **só o tema claro/escuro**,
como base técnica. O redesign visual das telas (parte B) fica pra depois, já
em cima do sistema de tema pronto.

Decisões já validadas com o usuário:
- Tema padrão na primeira visita: segue a preferência do sistema
  (`prefers-color-scheme`), com fallback pro escuro atual se o navegador não
  informar nada.
- Botão de trocar tema: ícone de sol/lua fixo no topo, perto do avatar de
  perfil e do sino de notificações (`.usuario-barra`, `index.html:102-116`),
  visível em todas as telas.
- Persistência: só neste aparelho/navegador (`localStorage`), sem sincronizar
  com a conta no Firestore.

## Arquitetura

Um atributo `data-tema` no elemento `<html>`, com dois valores possíveis:
`"escuro"` (ou ausência do atributo — mantém o comportamento atual como
fallback seguro) e `"claro"`. As variáveis de cor em `:root` continuam sendo a
definição do tema escuro (nada muda pra quem nunca tocar no botão); um novo
bloco `:root[data-tema="claro"] { ... }` sobrescreve essas mesmas variáveis
com os valores do tema claro.

**Evitar flash de tema errado (FOUC):** a decisão de qual tema aplicar deve
acontecer *antes* da primeira pintura da página, então um pequeno script
**inline**, direto no `<head>` de `index.html` (antes do `<link
rel="stylesheet" href="style.css">` ou logo depois, mas sempre antes do
`<body>` renderizar), faz:
```js
(function () {
  var salvo = localStorage.getItem("temaPreferido");
  var tema = salvo || (window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro");
  if (tema === "claro") document.documentElement.setAttribute("data-tema", "claro");
})();
```
Esse script fica só no `<head>` (não em arquivo separado) porque precisa
rodar de forma síncrona antes do CSS ser aplicado visualmente — mover pra um
arquivo `.js` carregado no fim do `<body>` (como todo o resto do app) causaria
o flash que estamos evitando.

**Arquivo novo `tema.js`** (carregado no fim do `<body>`, junto dos outros
scripts de feature como `notificacoes-locais.js`/`verificar-atualizacao.js`),
cuidando só da interação do botão:
- Lê o atributo atual de `document.documentElement`.
- Ao clicar no botão, alterna entre `"claro"`/`"escuro"`, aplica o novo
  atributo, salva em `localStorage.setItem("temaPreferido", tema)`, e
  atualiza o ícone do botão (☀️ quando está no claro — indicando a ação de
  "ir pro escuro" — ou 🌙 quando está no escuro, seguindo a convenção comum
  de mostrar o ícone do estado *pra onde* vai ao clicar).

## Markup novo (`index.html`)

Dentro de `.usuario-barra` (`index.html:102-116`), ao lado do sino de
notificações:
```html
<button type="button" id="btn-tema" class="btn-tema" aria-label="Alternar tema claro/escuro">🌙</button>
```
O ícone inicial no HTML estático não importa muito (é reescrito por
`tema.js` assim que a página carrega, refletindo o tema real já aplicado pelo
script inline do `<head>`).

## Paleta clara

Reaproveita os mesmos nomes de variável, mantendo a identidade visual (roxo
como cor de marca) mas invertendo a base pra clara:

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

As cores de status (`--cor-positivo/informativo/atencao/alerta`) ficam um
pouco mais escuras/saturadas que no tema escuro — necessário porque essas
cores são usadas como **texto** direto sobre fundo claro em vários lugares
(badges de status, avisos), e os tons originais (ex: `#f1c40f` amarelo puro)
têm contraste ruim em fundo branco. Ver seção de exceções abaixo.

## Exceções que precisam de tratamento específico (não são só a troca de variável)

Levantamento feito no `style.css` atual — a maior parte do arquivo já usa
`var(--cor-*)` e herda o tema automaticamente, mas alguns pontos têm cor fixa
em hexadecimal e precisam de uma regra extra dentro de
`:root[data-tema="claro"]` (ou de um seletor mais específico) pra continuar
legíveis:

1. **Título do header** (`style.css:46`,
   `background: linear-gradient(135deg, #fff, #b8a6ff)` com
   `background-clip: text; color: transparent;`) — esse gradiente claro só
   funciona visualmente sobre o fundo escuro atual; em fundo claro o texto
   ficaria quase invisível. Precisa de uma variante escura do gradiente
   (ex: `linear-gradient(135deg, #4c1d95, #7c3aed)`) especificamente dentro
   de `:root[data-tema="claro"] header h1`.
2. **Badges de status** (`style.css:1794-1818`, classes `.badge.*` e
   `.select-status.status-*`) — usam `color: #f1c40f` (amarelo),
   `#3498db` (azul), `#f39c12` (laranja), `#2ecc71` (verde), `#7f8c8d`
   (cinza), `#e74c3c` (vermelho) diretamente, mais `border-color: rgba(...)`
   com a mesma cor em baixa opacidade. Trocar essas cores fixas por
   `var(--cor-atencao)`, `var(--cor-informativo)` etc. (usando os novos tons
   mais escuros da paleta clara listados acima) resolve o contraste sem
   precisar duplicar as ~15 regras — é uma refatoração pequena e cirúrgica,
   restrita apenas a essas classes.
3. **Gradientes de botão primário** (`style.css:137,414,516,1091,2160,2317,
   2493,2544`, `linear-gradient(135deg, var(--cor-destaque), #6d28d9)`) — já
   usam a variável pro primeiro stop; o segundo stop fixo (`#6d28d9`) é um
   roxo escuro que funciona igual de bem como fundo de botão com texto
   branco em cima, nos dois temas — **não precisa mudar**.
4. **Máscara de fade** (`style.css:1204-1205`,
   `mask-image: linear-gradient(180deg, #000 60%, transparent 100%)`) — usa
   preto só como canal alpha da máscara (não é cor visível), **não precisa
   mudar**.

Este levantamento não é exaustivo pixel-a-pixel — durante a implementação,
qualquer outro ponto com baixo contraste encontrado ao testar visualmente
cada aba no tema claro deve ser corrigido do mesmo jeito (variável ou regra
específica sob `:root[data-tema="claro"]`), seguindo o mesmo critério: texto
sempre legível sobre `var(--cor-fundo)`/`var(--cor-card)`.

## Fora de escopo (fica pra próxima etapa)

- Qualquer mudança de layout, espaçamento, tipografia ou estrutura das
  telas — isso é o redesign visual (parte B), spec separada.
- Sincronizar a preferência de tema com a conta/Firestore.
- Detectar mudança de tema do sistema *depois* que a página já carregou (ex:
  o celular troca de claro pra escuro automaticamente à noite enquanto o app
  está aberto) — só é lido uma vez, no carregamento, a menos que o usuário
  não tenha uma preferência salva ainda.

## Verificação

Manual, no navegador (sem suíte de testes automatizada):
1. Primeira visita (sem `localStorage` salvo), sistema operacional/navegador
   em modo claro → app abre no tema claro; em modo escuro → abre no escuro.
2. Clicar no botão de sol/lua alterna o tema instantaneamente, no app
   inteiro (não só na tela atual).
3. Recarregar a página depois de trocar o tema → mantém a última escolha
   (via `localStorage`), independente da preferência do sistema.
4. Sem flash de tema errado perceptível ao carregar a página (testar
   especialmente com o tema claro escolhido e o sistema em modo escuro, caso
   mais propenso a mostrar flash se a implementação tiver algum erro).
5. Passar por todas as abas (Dashboard, Consultar, Lista, Timeline,
   Estatísticas, Amigos — incluindo o painel completo do amigo — e
   Discovery) e o modal de Perfil, em ambos os temas, conferindo legibilidade
   de texto, badges de status, título do header, e botões.
6. Regressão: tema escuro (padrão/fallback) continua pixel-idêntico ao
   comportamento atual, já que `:root` sem o atributo não muda.
