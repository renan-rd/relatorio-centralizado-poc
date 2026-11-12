# Centralizador — POC estático

Réplica em HTML/CSS/JS puro dos relatórios de captação do MFE
`@resultadosdigitais/analytics-frontend-commons-analysis-centralizer`, feita
para testes com usuários sem subir nem alterar o MFE. É um site estático: não
há build, dependências, backend nem chamadas de rede — os dados são sintéticos,
gerados no navegador.

A tela replica o estado atual do MFE:

- menu lateral **Relatórios → Captação** com as duas telas:
  **Como está a captação** e **Como foram os e-mails**;
- a seção **Vendas** está desligada, como no MFE (não aparece no menu e links
  antigos caem na captação);
- o painel de captação é **um bloco só**: os cards de KPI também ligam e
  desligam as séries do gráfico, que tem três leituras (por dia, acumulado e
  taxas), sobreposição do período anterior e projeção do mês corrente.

## Rodando localmente

```bash
# qualquer servidor estático serve; o arquivo é o index.html da raiz
python3 -m http.server 4173
# http://localhost:4173
```

Abrir o `index.html` direto (`file://`) também funciona — os scripts são
clássicos, não módulos, então não esbarram em CORS.

Para abrir direto num relatório: `?relatorio=captacao` (padrão) ou
`?relatorio=emails`.

## Publicando no GitHub Pages

O workflow em [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
publica a raiz do repositório a cada push na `main`. No repositório:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**;
2. push na `main` (ou rodar o workflow manualmente em **Actions**).

Todos os caminhos são relativos, então o site funciona tanto na raiz
(`usuario.github.io/repo/`) quanto num domínio próprio.

## O que foi replicado

| Bloco                                  | O que aparece                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Menu de relatórios                     | "Relatórios", grupo "Captação" e as duas telas; item ativo com a pílula azul do Tangram                                    |
| Cabeçalho + período                    | Título do relatório, seletor de período (atalhos + calendário personalizado) com o mesmo estado compartilhado entre telas   |
| Desempenho no período                  | 5 cards (visitantes, leads, qualificados, oportunidades, vendas) com valor, pill de variação, "Antes: …" e taxa por etapa |
| Gráfico único                          | Três leituras: **Por dia**, **Acumulado** e **Taxas**; visitantes em eixo próprio; clique no card liga/desliga a série      |
| Comparar com período anterior          | Sobreposição tracejada; no mês corrente a referência é o mês anterior fechado, com projeção pontilhada até o fim do mês     |
| Visão de taxas                         | Três cards de taxa com pill de classificação, barra da faixa recente e ponto da taxa observada                              |
| Conversões                             | Dois números (leads qualificados e oportunidades) e "Conversões durante o tempo", com séries ligáveis e projeção opcional   |
| Campanhas e automações de email        | 8 cards de métrica, ressalva de escopo e 3 abas de tabela, com a coluna Tipo                                                |

### Fidelidade visual

- **Tokens**: cores, tipografia, espaçamentos, raios e sombras do tema Tangram
  `lina` modo claro (v3.16.0) estão em `assets/css/tokens.css`, copiados do
  bundle de design tokens do MFE.
- **Medidas**: extraídas do DOM da tela real via DevTools (menu de 240px, card
  de KPI de 300px de altura, raio 16px, borda `#d6dbde`, trigger de 40px,
  calendário com colunas de 40px, tabela com 16px de padding, grid de e-mail de
  4 colunas a partir de 900px…).
- **Tipografia**: DM Sans, com os mesmos tamanhos/pesos (título de página
  28px/700, título de bloco 20px/700, valor 28px/700, pill 12px/700, rótulo de
  card de email 14px/700 caixa alta).
- **Gráficos**: SVG puro com a curva monotônica do d3 (`curveMonotoneX`), que é
  a mesma que o recharts usa em `type="monotone"`; grid tracejado, eixos com os
  mesmos formatos, referência tracejada, projeção pontilhada e tooltip com
  cursor vertical.

### Números

A janela inicial (**últimos 3 meses**) mostra os mesmos números da tela real no
momento em que o protótipo foi montado:

- visitantes 189.930 (antes 171.522, +10,73%);
- leads 10.464 (antes 11.885, −11,96%), 5,51% dos visitantes;
- qualificados 3.646 (antes 4.238, −13,97%), 34,84% dos leads;
- oportunidades 1.240 (antes 1.243, −0,24%), 34,01% dos qualificados;
- vendas 278 (antes 401, −30,67%), 22,42% das oportunidades;
- taxas 34,8% / 34,0% / 22,4% com as faixas 35,4–37,3 / 29,6–32,6 / 27,9–33,0;
- conversões: 1.830 leads qualificados, 1.179 oportunidades; séries 7.218 /
  1.179 / 395;
- email: 9 origens, 33.616 envios, 32.198 entregas, 9.133 aberturas (28,37%),
  1.676 cliques (5,21%), 1.418 bounces.

**Toda série fecha com o número que ela alimenta.** A soma dos dias do gráfico
é o valor do hero do card; a soma dos pontos das conversões é o número do
controle de série; a tabela e os cards de email saem das mesmas origens; as
variações recalculam a partir dos dois períodos; e as taxas da faixa são a razão
exata dos totais. Vale para qualquer janela do seletor.

As demais janelas são geradas deterministicamente a partir da média diária do
trimestre, com um fator por janela (±10%) para que as variações não sejam todas
0%. A janela anterior da padrão também é fixa, então selecioná-la no seletor
mostra exatamente os valores que as pills estavam comparando. Reabrir a mesma
janela devolve os mesmos números.

> **Nota sobre a tela real:** nela o gráfico diário e os cards de KPI vêm de
> granularidades diferentes e não fecham entre si (o gráfico de leads pode
> mostrar 270 mil contra 10 mil no card). Isso é artefato da fake API do MFE,
> não do produto. Numa tela de teste com usuários, dois totais para o mesmo
> período viram ruído — aqui os dois usam a mesma base.

## Estados simulados

- **Conta sem Google Analytics**: o botão no rodapé alterna o estado. O card de
  visitantes passa a explicar a ausência da integração, a série de visitantes
  sai do gráfico e o eixo da direita desaparece; a taxa "5,51% dos visitantes"
  do card de leads também some, porque não há denominador.
- **Faixa esperada bloqueada**: períodos acima de 93 dias mostram "Selecione um
  período de até 3 meses" na visão de taxas em vez dos cards.
- **Nenhuma série selecionada**: o gráfico é substituído por "Selecione ao menos
  uma série para comparar".
- **Comparação**: ligar "Comparar com período anterior" desenha o período
  anterior tracejado e troca o eixo X por D1, D2… (as datas das duas janelas não
  coincidem). No mês corrente a referência é o mês anterior fechado e a curva
  atual ganha a projeção pontilhada até o último dia do mês.
- **Projeção das conversões**: aparece o controle "Ver projeção" quando a janela
  termina no mês corrente; o tooltip dos dias projetados mostra "≈ N por dia".
- **Erro de carregamento / dado desatualizado**: previstos na tela real, não
  simulados aqui (os dados são locais e sempre respondem).

## Estrutura

```
index.html                 página única (menu + casca do relatório)
assets/css/tokens.css      tokens do Tangram (lina, claro)
assets/css/styles.css      layout e componentes
assets/js/data.js          geradores de dados sintéticos
assets/js/charts.js        gráficos em SVG (área, eixos, comparação, projeção, tooltip)
assets/js/app.js           renderização e interação
```

## Diferenças em relação ao MFE

- **Sem rede**: o MFE chama `/web_api/v1/analytics/marketing_panel/*`; aqui tudo
  vem de `data.js`.
- **Séries internamente consistentes**: no MFE, o gráfico diário e os cards usam
  granularidades diferentes e não fecham entre si (artefato da fake API — ver
  "Números"). Aqui fecham sempre.
- **Janelas estáveis**: no MFE, a janela anterior é sorteada pela fake API. Aqui
  ela é determinística, e reabrir a mesma janela mostra os mesmos números.
- **Projeção desenhada até o fim do mês**: o componente atual do MFE calcula a
  projeção, mas o tracejado aparece só como um traço vertical no último dia
  medido (os pontos projetados chegam sem valor para o `Area`). Aqui o ritmo
  médio é desenhado de verdade — é o que a tela pretende comunicar e o que faz
  sentido validar com usuários.
- **Sem estados de carregamento**: o MFE mostra skeletons na primeira carga e
  preserva o período anterior enquanto recarrega (~9s por chamada). Não há o que
  carregar aqui.
- **Sem os textos de erro**: mensagens de falha de API não aparecem porque não há
  API.
- **Estado de tela**: a leitura do gráfico (por dia / acumulado / taxas), as
  séries ligadas e a aba de email voltam ao padrão ao trocar de relatório; o
  período escolhido é compartilhado entre as duas telas, como no MFE. O
  relatório aberto vai na query `relatorio` (links sobrevivem ao reload).

## Origem

O MFE de referência está em
`analytics-frontend-commons/packages/analysis-centralizer`. Os textos são os do
locale `pt-BR` do próprio pacote.
