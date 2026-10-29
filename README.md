# Painel de marketing — POC estático

Réplica em HTML/CSS/JS puro do **Painel de marketing** do MFE
`@resultadosdigitais/analytics-frontend-commons-analysis-centralizer`, feita para
testes com usuários sem subir nem alterar o MFE. É um site estático: não há
build, dependências, backend nem chamadas de rede — os dados são sintéticos,
gerados no navegador.

## Rodando localmente

```bash
# qualquer servidor estático serve; o arquivo é o index.html da raiz
python3 -m http.server 4173
# http://localhost:4173
```

Abrir o `index.html` direto (`file://`) também funciona — os scripts são
clássicos, não módulos, então não esbarram em CORS.

## Publicando no GitHub Pages

O workflow em [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
publica a raiz do repositório a cada push na `main`. No repositório:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**;
2. push na `main` (ou rodar o workflow manualmente em **Actions**).

Todos os caminhos são relativos, então o site funciona tanto na raiz
(`usuario.github.io/repo/`) quanto num domínio próprio.

## O que foi replicado

| Bloco                          | O que aparece                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Cabeçalho + período            | Título "Painel de marketing", subtítulo e o seletor de período (atalhos + calendário personalizado)         |
| Funil                          | 5 cards (visitantes, leads, qualificados, oportunidades, vendas) com valor, pill de variação e sparkline    |
| Evolução por dia               | Gráfico de área com 5 séries ligáveis e aviso da escala de visitantes                                       |
| Faixa esperada                 | 3 cards de taxa com trilho da faixa e classificação (dentro / acima / abaixo / insuficiente)                |
| Conversões                     | 2 números e o gráfico "Conversões durante o tempo", com séries ligáveis                                     |
| Campanhas e automações de email| 8 cards de métrica + 3 abas de tabela (maiores envios, últimas campanhas, maiores cliques)                  |

### Fidelidade visual

Os valores não foram estimados: vieram da tela real rodando em `localhost:3000`.

- **Tokens**: cores, tipografia, espaçamentos, raios e sombras do tema Tangram
  `lina` modo claro (v3.16.0) estão em `assets/css/tokens.css`, copiados do
  bundle de design tokens do MFE.
- **Medidas**: extraídas do DOM via DevTools (card de 300px de altura, raio
  16px, borda `#d6dbde`, sparkline de 132px, trigger de 40px, calendário com
  colunas de 40px, tabela com 16px de padding…).
- **Tipografia**: DM Sans, com os mesmos tamanhos/pesos (título 20px/700,
  valor 28px/700, pill 12px/700, rótulo de card de email 14px/700 caixa alta).
- **Gráficos**: SVG puro com a curva monotônica do d3 (`curveMonotoneX`), que é
  a mesma que o recharts usa em `type="monotone"`. Grid tracejado, eixos com os
  mesmos formatos e tooltip com cursor vertical.

### Números

A janela padrão (**últimos 3 meses**) mostra os mesmos números da tela real:

- visitantes 188.608 · leads 11.027 · qualificados 3.913 · oportunidades 1.251 · vendas 297;
- taxas 35,5% / 32,0% / 23,7%, com as mesmas faixas;
- email: 9 origens, 36.093 envios, 34.322 entregas, 12.022 aberturas, 2.130 cliques.

**Toda série fecha com o número que ela alimenta.** A soma dos dias do gráfico é
o valor do hero do card; a soma dos meses do sparkline também; os totais do
controle de série são os dos cards; as variações recalculam a partir dos dois
períodos; e as taxas da faixa são a razão exata dos totais. Isso vale para
qualquer janela do seletor — foi verificado com 300 janelas aleatórias.

As demais janelas geram séries determinísticas calibradas pela média diária do
trimestre, com um fator por janela (±12%) para que as variações não sejam todas
0%. A janela anterior da padrão também é fixa, então selecioná-la no seletor
mostra exatamente os valores que as pills estavam comparando.

> **Nota sobre a tela real:** nela o gráfico mostra 272.681 leads contra 11.027
> no card. Isso é artefato da fake API do MFE, não do produto: o gerador dela
> sorteia 1800–4200 leads **por bucket**, então a mesma janela rende 4 sorteios
> em `granularity=month` e 93 em `granularity=day`. Na DPDA real o período soma
> o mesmo nas duas granularidades. Aqui os dois usam a mesma base — em teste com
> usuário, dois totais para o mesmo período viram ruído.

## Estados simulados

- **Conta sem Google Analytics**: o botão no rodapé alterna o estado. O card de
  visitantes passa a explicar a ausência da integração em vez de mostrar zero, e
  a série de visitantes sai do gráfico e dos controles — é o comportamento da
  tela real.
- **Faixa esperada bloqueada**: períodos acima de 93 dias mostram o aviso
  "Selecione um período de até 3 meses" em vez dos cards.
- **Erro de carregamento / dado desatualizado**: previstos na tela real, não
  simulados aqui (os dados são locais e sempre respondem).

## Estrutura

```
index.html                 página única
assets/css/tokens.css      tokens do Tangram (lina, claro)
assets/css/styles.css      layout e componentes
assets/js/data.js          geradores de dados sintéticos
assets/js/charts.js        gráficos em SVG (área, sparkline, tooltip)
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
- **Sem estados de carregamento**: o MFE mostra skeletons na primeira carga e
  preserva o período anterior enquanto recarrega (~9s por chamada). Não há o que
  carregar aqui.
- **Sem os textos de erro**: mensagens de falha de API não aparecem porque não há
  API.
- **Séries e abas são estado de página**, não de rota — recarregar volta ao
  período padrão.

## Origem

O MFE de referência está em
`analytics-frontend-commons/packages/analysis-centralizer`. Os textos são os do
locale `pt-BR` do próprio pacote.
