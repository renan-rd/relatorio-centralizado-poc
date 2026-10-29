// Dados sintéticos do POC do Painel de marketing.
//
// Reproduz o contrato e os números da tela do MFE (`analysis-centralizer`),
// sem nenhuma chamada de rede: a página é estática (GitHub Pages).
//
// Duas escalas convivem, como na tela real:
//
//   - os CARDS do funil vêm de uma leitura mensal (`granularity=month`);
//   - o gráfico "Evolução por dia" vem de uma leitura diária
//     (`granularity=day`) com volume próprio, maior que o dos cards
//     (272.681 leads no gráfico contra 11.027 no card).
//
// Cada série fecha internamente: a soma dos meses do funil É o valor do card;
// a soma dos dias do gráfico É o total mostrado no controle de série.
(function () {
  'use strict'

  const DAY_MS = 86400000

  // ─── Datas (UTC ao meio-dia: o dia não pula por fuso) ──────────────────────
  const toISO = date => date.toISOString().slice(0, 10)
  const toDate = iso => new Date(`${iso}T12:00:00Z`)
  const addDays = (iso, days) => toISO(new Date(toDate(iso).getTime() + days * DAY_MS))
  const daysBetween = (start, end) => Math.round((toDate(end) - toDate(start)) / DAY_MS) + 1

  function eachDay(start, end) {
    const dates = []
    for (let iso = start; iso <= end; iso = addDays(iso, 1)) dates.push(iso)
    return dates
  }

  const startOfMonth = iso => `${iso.slice(0, 7)}-01`
  const monthKey = iso => iso.slice(0, 7)

  function shiftMonths(iso, months) {
    // Mesmo dia do mês, recuando/avançando N meses; se o dia não existir no
    // mês destino (31 → fevereiro), cai no último dia dele.
    const date = toDate(iso)
    const day = date.getUTCDate()
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate()
    target.setUTCDate(Math.min(day, lastDay))
    return toISO(target)
  }

  // ─── PRNG determinístico (mesmo FNV-1a + mulberry32 dos geradores reais) ───
  function hashSeed(text) {
    let hash = 0x811c9dc5
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }

  function seededRandom(seedText) {
    let a = hashSeed(seedText)
    return () => {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  // ─── Janelas ───────────────────────────────────────────────────────────────
  function todayAtNoon() {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12))
  }

  function defaultRange() {
    const today = toISO(todayAtNoon())
    return { startDate: shiftMonths(today, -3), endDate: today }
  }

  function previousPeriod(startDate, endDate) {
    const days = daysBetween(startDate, endDate)
    return { startDate: addDays(startDate, -days), endDate: addDays(startDate, -1) }
  }

  const PICKER_MIN_DATE = '2023-09-01'

  function presetRange(id, today = toISO(todayAtNoon())) {
    const dow = toDate(today).getUTCDay()
    switch (id) {
      case 'today':
        return { startDate: today, endDate: today }
      case 'this_week':
        // Semana de domingo a sábado (padrão pt-BR).
        return { startDate: addDays(today, -dow), endDate: today }
      case 'this_month':
        return { startDate: startOfMonth(today), endDate: today }
      case 'last_7':
        return { startDate: addDays(today, -6), endDate: today }
      case 'last_14':
        return { startDate: addDays(today, -13), endDate: today }
      case 'last_30':
        return { startDate: addDays(today, -29), endDate: today }
      case 'last_3_months':
        return { startDate: shiftMonths(today, -3), endDate: today }
      default:
        return { startDate: today, endDate: today }
    }
  }

  const PRESET_GROUPS = [
    ['today', 'this_week', 'this_month'],
    ['last_7', 'last_14', 'last_30', 'last_3_months'],
  ]

  // ─── Formas das séries ─────────────────────────────────────────────────────
  // Curva semanal: fim de semana cai, início de semana sobe. É o serrilhado do
  // gráfico diário da tela real.
  const WEEKDAY_FACTOR = [0.42, 1.06, 1.02, 1.05, 1.0, 0.9, 0.48]
  const weekdayFactor = iso => WEEKDAY_FACTOR[toDate(iso).getUTCDay()]

  // Escala uma série para um total exato — o hero do card e a soma da série
  // nunca divergem. O resíduo do arredondamento cai no maior ponto.
  function scaleToTotal(values, total) {
    const sum = values.reduce((acc, value) => acc + value, 0)
    if (!sum || !total) return values.map(() => 0)
    const scaled = values.map(value => Math.round((value / sum) * total))
    const diff = total - scaled.reduce((acc, value) => acc + value, 0)
    if (diff !== 0) {
      let index = 0
      scaled.forEach((value, i) => {
        if (value > scaled[index]) index = i
      })
      scaled[index] += diff
    }
    return scaled
  }

  // Reparte `total` entre os dias por peso (semana), devolvendo a soma exata.
  function splitByDay(dates, total, seedText) {
    const weights = dates.map(date => {
      const rand = seededRandom(`${seedText}:${date}`)
      return weekdayFactor(date) * (0.84 + rand() * 0.32)
    })
    return scaleToTotal(weights, total)
  }

  // ─── Números da janela padrão ──────────────────────────────────────────────
  // Todos extraídos da fake API da tela real (mesmo contrato, mesmos valores).
  const DEMO_DAYS = 93

  const DEMO_STAGES = {
    leads: 11027,
    qualified_leads: 3913,
    opportunities: 1251,
    sales: 297,
  }

  // Variações da tela real: +9,34% leads, +0,67% qualificados, +12,8%
  // oportunidades, −13,16% vendas.
  const DEMO_PREVIOUS_STAGES = {
    leads: 10085,
    qualified_leads: 3887,
    opportunities: 1109,
    sales: 342,
  }

  // Buckets mensais do funil (granularity=month): são eles que desenham o
  // sparkline dos cards. O primeiro mês entra com 3 dias — julho, cortado pelo
  // início do período — e por isso começa baixo.
  const DEMO_MONTHS = [
    { date: '2026-07-29', leads: 2122, qualified: 912, opportunities: 255, sales: 75 },
    { date: '2026-08-01', leads: 2493, qualified: 666, opportunities: 228, sales: 47 },
    { date: '2026-09-01', leads: 4096, qualified: 1544, opportunities: 520, sales: 130 },
    { date: '2026-10-01', leads: 2316, qualified: 791, opportunities: 248, sales: 45 },
  ]

  const DEMO_VISITORS = { total: 188608, previousTotal: 175242 }

  // Visitantes por mês no período padrão (a soma é o total do card).
  const DEMO_VISITOR_MONTHS = {
    '2026-07': 5088,
    '2026-08': 64148,
    '2026-09': 55531,
    '2026-10': 63841,
  }

  // Totais do gráfico "Evolução por dia".
  //
  // Na tela real estes números são MAIORES que os dos cards (272.681 leads
  // contra 11.027), mas isso é artefato da fake API, não do produto: o gerador
  // dela sorteia 1800–4200 leads POR BUCKET, então a janela de 93 dias rende 4
  // sorteios em `granularity=month` e 93 sorteios em `granularity=day`. Na
  // DPDA real o mesmo período soma o mesmo total nas duas granularidades.
  //
  // Aqui o gráfico e os cards usam a MESMA base — a soma dos dias é o valor do
  // card. Numa tela de teste com usuários, dois totais diferentes para o mesmo
  // período viram ruído na conversa ("por que o gráfico diz 272 mil?").
  const DEMO_CONVERSIONS = {
    total: 7076,
    opportunities: 1127,
    customers: 381,
    qualifiedLeads: 1785,
  }

  // Faixa da janela padrão — os valores da tela real (35,5% em [35,5; 37,3],
  // 32,0% em [30,0; 32,9], 23,7% em [25,2; 30,1]).
  const DEMO_BANDS = [
    { id: 'qualification', observed: 0.355, trials: 11027, low: 0.355, high: 0.373, band: 'dentro' },
    { id: 'opportunity', observed: 0.32, trials: 3913, low: 0.3, high: 0.329, band: 'dentro' },
    { id: 'win', observed: 0.237, trials: 1251, low: 0.252, high: 0.301, band: 'abaixo' },
  ]

  // ─── Funil mensal (sparkline dos cards) ────────────────────────────────────
  // Gera um bucket por mês do período. No período padrão usa os valores exatos
  // da fake API; em qualquer outra janela reparte o total do card entre os
  // meses por peso (dias do mês dentro do período × sazonalidade), garantindo
  // que a soma dos buckets feche no total do card.
  const MONTH_FACTOR = [1.1, 0.85, 1.2, 0.8, 1.05, 0.9, 1.15, 0.8, 1.1, 0.85, 1.2, 0.95]

  function monthWeights(startDate, endDate, seedText) {
    const months = []
    eachDay(startDate, endDate).forEach(date => {
      const key = monthKey(date)
      let bucket = months[months.length - 1]
      if (!bucket || bucket.key !== key) {
        bucket = { key, date, days: 0 }
        months.push(bucket)
      }
      bucket.days += 1
    })
    return months.map(bucket => {
      const rand = seededRandom(`${seedText}:${bucket.key}`)
      const seasonal = MONTH_FACTOR[toDate(bucket.date).getUTCMonth()] ?? 1
      return { ...bucket, weight: bucket.days * seasonal * (0.85 + rand() * 0.3) }
    })
  }

  function buildMonths(startDate, endDate, totals, isDemo) {
    if (isDemo) {
      return DEMO_MONTHS.map(month => ({
        key: monthKey(month.date),
        date: month.date,
        leads: month.leads,
        qualified_leads: month.qualified,
        opportunities: month.opportunities,
        sales: month.sales,
      }))
    }

    const months = monthWeights(startDate, endDate, 'months')
    const sum = months.reduce((acc, month) => acc + month.weight, 0)
    const stages = ['leads', 'qualified_leads', 'opportunities', 'sales']

    // O arredondamento de cada mês é corrigido com `scaleToTotal`, não com
    // `Math.round(total * share)`: dividir 4 pontos em 3 meses com escolhas
    // independentes podia somar 1 a mais ou a menos que o total do card. Aqui o
    // resíduo cai no maior mês e a soma fecha exatamente.
    return stages.reduce(
      (rows, stage) => {
        const values = scaleToTotal(
          months.map(month => (sum ? month.weight / sum : 1 / months.length)),
          totals[stage] ?? 0,
        )
        rows.forEach((row, i) => {
          row[stage] = values[i]
        })
        return rows
      },
      months.map(month => ({ key: month.key, date: month.date })),
    )
  }

  // ─── Funil diário ──────────────────────────────────────────────────────────
  // Reparte o total de cada estágio pelos dias do período, com o serrilhado da
  // semana. A soma devolve EXATAMENTE o total recebido.
  //
  // É a mesma série para os dois usos:
  //
  //   - o sparkline dos cards, quando o período tem até 89 dias (o eixo vira o
  //     dia);
  //   - o gráfico "Evolução por dia".
  //
  // Uma série só, porque os dois mostram os mesmos números na tela: o total do
  // controle de série do gráfico é o valor do hero do card.
  //
  // Não dá para "abrir" os buckets mensais para obter a série diária: um
  // período de 1 dia tem um único bucket, e o último bucket de qualquer período
  // não teria data final (não há mês seguinte para delimitar). Nos dois casos a
  // série sairia vazia e todo card cairia em "dados insuficientes".
  function buildDailyFunnel(startDate, endDate, totals) {
    const dates = eachDay(startDate, endDate)
    const leads = splitByDay(dates, totals.leads, 'leads')
    const qualified = splitByDay(dates, totals.qualified_leads, 'qualified_leads')
    const opportunities = splitByDay(dates, totals.opportunities, 'opportunities')
    const sales = splitByDay(dates, totals.sales, 'sales')
    return dates.map((date, i) => ({
      date,
      leads: leads[i],
      qualified_leads: qualified[i],
      opportunities: opportunities[i],
      sales: sales[i],
    }))
  }

  // ─── Visitantes ────────────────────────────────────────────────────────────
  // Distribui o total entre os dias com sessão. O GA devolve só os dias com
  // visita; aqui omitimos ~1 dia em 9 para o join por data ter o mesmo buraco
  // que tem em produção.
  function buildVisitors(startDate, endDate, total, isDemo) {
    if (isDemo) return buildDemoVisitors(startDate, endDate)

    // Primeiro os dias que têm sessão. Um mês pode ficar SEM nenhum (período
    // que começa num único dia, e esse dia é omitido): ele não pode receber
    // cota, senão o valor dele se perde e a soma dos dias fica menor que o
    // hero do card.
    const visible = []
    eachDay(startDate, endDate).forEach(date => {
      const rand = seededRandom(`visitors:${date}`)
      if (rand() < 0.11) return
      visible.push({ date, weight: weekdayFactor(date) * (0.55 + rand() * 1.1) })
    })
    if (!visible.length) return []

    // Reparte entre os meses com dados, e o mês entre os seus dias. As duas
    // etapas usam `scaleToTotal`, então a soma final é exatamente o total.
    const monthWeights = new Map()
    visible.forEach(row => {
      const key = monthKey(row.date)
      monthWeights.set(key, (monthWeights.get(key) ?? 0) + row.weight)
    })
    const monthKeys = [...monthWeights.keys()]
    const monthSum = monthKeys.reduce((acc, key) => acc + monthWeights.get(key), 0)
    const monthTotals = scaleToTotal(
      monthKeys.map(key => (monthSum ? monthWeights.get(key) / monthSum : 1 / monthKeys.length)),
      total,
    )

    const result = monthKeys.reduce((rows, key, index) => {
      const monthRows = visible.filter(row => monthKey(row.date) === key)
      const values = scaleToTotal(
        monthRows.map(row => row.weight),
        monthTotals[index],
      )
      monthRows.forEach((row, i) => {
        rows.push({ date: row.date, visitors: values[i] })
      })
      return rows
    }, [])

    // Dias com 0 visitante não existem na resposta do GA — dia sem linha é dia
    // sem sessão, e quem preenche com 0 é o consumidor.
    return result.filter(row => row.visitors > 0)
  }

  // Série de visitantes da janela padrão: os totais mensais são os da tela real
  // e cada mês é repartido entre os seus dias.
  function buildDemoVisitors(startDate, endDate) {
    const result = []
    Object.entries(DEMO_VISITOR_MONTHS).forEach(([key, monthTotal]) => {
      const monthRows = []
      eachDay(startDate, endDate).forEach(date => {
        if (monthKey(date) !== key) return
        const rand = seededRandom(`visitors:${date}`)
        if (rand() < 0.11) return
        monthRows.push({ date, weight: weekdayFactor(date) * (0.55 + rand() * 1.1) })
      })
      if (!monthRows.length) return
      const values = scaleToTotal(monthRows.map(row => row.weight), monthTotal)
      monthRows.forEach((row, i) => {
        result.push({ date: row.date, visitors: values[i] })
      })
    })
    return result.filter(row => row.visitors > 0).sort((a, b) => a.date.localeCompare(b.date))
  }

  // ─── Conversões ────────────────────────────────────────────────────────────
  function buildConversions(startDate, endDate, totals) {
    const dates = eachDay(startDate, endDate)
    const conversions = splitByDay(dates, totals.conversions, 'conversions')
    const opportunities = splitByDay(dates, totals.opportunities, 'conv-opportunities')
    const customers = splitByDay(dates, totals.customers, 'customers')
    return dates.map((date, i) => ({
      date,
      conversions: conversions[i],
      opportunities: opportunities[i],
      customers: customers[i],
    }))
  }

  // ─── Relatório de email ────────────────────────────────────────────────────
  // Nove origens (campanhas + automações) fechando exatamente os totais da tela
  // real: 36.093 envios, 34.322 entregas, 12.022 aberturas, 2.130 cliques.
  const DEMO_EMAIL_ORIGINS = [
    { name: 'Pós-venda', type: 'workflow', sent: 5932, delivered: 5851, opened: 1950, clicked: 352 },
    { name: 'Black Friday', type: 'campaign', sent: 4721, delivered: 4495, opened: 1881, clicked: 333, sentAt: '2026-10-13' },
    { name: 'Lançamento de produto', type: 'campaign', sent: 4237, delivered: 3998, opened: 1550, clicked: 238, sentAt: '2026-08-27' },
    { name: 'Newsletter mensal', type: 'campaign', sent: 4217, delivered: 4057, opened: 1467, clicked: 184, sentAt: '2026-08-12' },
    { name: 'Fluxo de boas-vindas', type: 'workflow', sent: 3743, delivered: 3545, opened: 1204, clicked: 174 },
    { name: 'Conteúdo educativo', type: 'campaign', sent: 3826, delivered: 3442, opened: 1199, clicked: 427, sentAt: '2026-10-02' },
    { name: 'Convite para webinar', type: 'campaign', sent: 3312, delivered: 3150, opened: 1058, clicked: 189, sentAt: '2026-09-15' },
    { name: 'Reengajamento de base', type: 'workflow', sent: 3210, delivered: 3040, opened: 902, clicked: 137 },
    { name: 'Pesquisa de satisfação', type: 'campaign', sent: 2895, delivered: 2744, opened: 811, clicked: 96, sentAt: '2026-07-30' },
  ]

  const CAMPAIGN_NAMES = [
    'Newsletter mensal',
    'Lançamento de produto',
    'Convite para webinar',
    'Black Friday',
    'Reengajamento de base',
    'Pesquisa de satisfação',
    'Conteúdo educativo',
    'Oferta especial',
  ]
  const WORKFLOW_NAMES = ['Fluxo de boas-vindas', 'Nutrição de leads', 'Carrinho abandonado', 'Pós-venda']

  function buildEmail(startDate, endDate, isDemo) {
    const days = daysBetween(startDate, endDate)
    const rand = seededRandom(`email:${startDate}:${endDate}`)
    let origins

    if (isDemo) {
      origins = DEMO_EMAIL_ORIGINS.map((row, index) => ({ ...row, id: `${row.type}-${index + 1}` }))
    } else {
      const campaignCount = Math.max(1, Math.min(CAMPAIGN_NAMES.length, Math.round(days / 20)))
      const volume = 4000 * (days / DEMO_DAYS)
      const originOf = (type, name, index) => {
        const sent = Math.round(volume * (0.45 + rand() * 0.9))
        const delivered = Math.round(sent * (0.94 + rand() * 0.05))
        const opened = Math.round(delivered * (0.2 + rand() * 0.2))
        const clicked = Math.round(opened * (0.08 + rand() * 0.16))
        return {
          id: `${type}-${index + 1}`,
          name,
          type,
          sentAt: type === 'campaign' ? addDays(startDate, Math.floor(rand() * days)) : null,
          sent,
          delivered,
          opened,
          clicked,
        }
      }
      origins = [
        ...CAMPAIGN_NAMES.slice(0, campaignCount).map((name, i) => originOf('campaign', name, i)),
        ...WORKFLOW_NAMES.slice(0, Math.min(3, WORKFLOW_NAMES.length)).map((name, i) =>
          originOf('workflow', name, i),
        ),
      ]
    }

    const sum = key => origins.reduce((acc, row) => acc + row[key], 0)
    const sent = sum('sent')
    const delivered = sum('delivered')
    const opened = sum('opened')
    const clicked = sum('clicked')
    const rate = (numerator, denominator) =>
      denominator > 0 ? +((numerator / denominator) * 100).toFixed(2) : null

    // A tabela usa `sent` como denominador (é o que a tela real mostra); os
    // cards de taxa usam `delivered`. Os dois convivem de propósito.
    const rows = origins.map(row => ({
      ...row,
      sentAt: row.sentAt ?? null,
      openRate: rate(row.opened, row.sent),
      clickRate: rate(row.clicked, row.sent),
    }))

    const topBy = key => rows.slice().sort((a, b) => b[key] - a[key]).slice(0, 5)
    const dated = rows.filter(row => row.sentAt)

    return {
      isEmpty: origins.length === 0,
      period: { startDate, endDate },
      metrics: [
        { id: 'campaign_count', value: origins.length },
        { id: 'sent', value: sent },
        { id: 'delivered', value: delivered },
        { id: 'unique_opens', value: opened },
        { id: 'open_rate', value: rate(opened, delivered), isPercent: true },
        { id: 'unique_clicks', value: clicked },
        { id: 'click_rate', value: rate(clicked, delivered), isPercent: true },
        { id: 'unique_bounces', value: sent - delivered },
      ],
      tables: {
        sends: { rows: topBy('sent') },
        recent: { rows: dated.sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 5) },
        clicks: { rows: topBy('clicked') },
      },
    }
  }

  // ─── Faixa esperada das taxas de conversão ─────────────────────────────────
  // Mesma estatística da tela real: baseline = média das 3 janelas anteriores
  // de mesma duração; faixa = baseline ± 1,96 erro-padrão proporcional.
  const BAND_RATE_DEFS = [
    { id: 'qualification', numerator: 'leads', denominator: 'qualified_leads', inverse: true },
    { id: 'opportunity', numerator: 'qualified_leads', denominator: 'opportunities', inverse: true },
    { id: 'win', numerator: 'opportunities', denominator: 'sales', inverse: true },
  ]

  function proportionBand(baseline, trials, z = 1.96) {
    if (trials <= 0) return { low: 0, high: 1 }
    const clamped = Math.min(1, Math.max(0, baseline))
    const error = Math.sqrt((clamped * (1 - clamped)) / trials)
    return { low: Math.max(0, clamped - z * error), high: Math.min(1, clamped + z * error) }
  }

  // A taxa é estágio seguinte ÷ estágio atual (qualificados ÷ leads, e assim
  // por diante) — o nome de cada taxa segue essa ordem.
  function ratesOf(totals) {
    return {
      qualification: totals.leads > 0 ? totals.qualified_leads / totals.leads : null,
      opportunity: totals.qualified_leads > 0 ? totals.opportunities / totals.qualified_leads : null,
      win: totals.opportunities > 0 ? totals.sales / totals.opportunities : null,
    }
  }

  function buildBands(totals, baselineTotals) {
    const observedRates = ratesOf(totals)
    return BAND_RATE_DEFS.map(def => {
      const trialsByStage = { qualification: totals.leads, opportunity: totals.qualified_leads, win: totals.opportunities }
      const observed = observedRates[def.id]
      const trials = trialsByStage[def.id] ?? 0
      const baselineRates = baselineTotals
        .map(window => ratesOf(window)[def.id])
        .filter(value => value !== null)
      const baseline = baselineRates.length
        ? baselineRates.reduce((sum, value) => sum + value, 0) / baselineRates.length
        : null

      if (observed === null || baseline === null) {
        return { id: def.id, observed, trials, baseline, low: null, high: null, band: 'insuficiente' }
      }
      const limits = proportionBand(baseline, trials)
      let band = 'dentro'
      if (trials < 10) band = 'insuficiente'
      else if (observed < limits.low) band = 'abaixo'
      else if (observed > limits.high) band = 'acima'
      return { id: def.id, observed, trials, baseline, low: limits.low, high: limits.high, band }
    })
  }

  // ─── Montagem de um período ────────────────────────────────────────────────

  // Fator determinístico de uma janela: 0,88 a 1,12 (±12%), estável por datas e
  // por métrica. É o que faz duas janelas de mesma duração terem volumes
  // diferentes (e, portanto, variações diferentes de zero).
  function windowFactor(startDate, endDate, metric) {
    const seed = metric
      ? `window:${metric}:${startDate}:${endDate}`
      : `window:${startDate}:${endDate}`
    return 0.88 + seededRandom(seed)() * 0.24
  }

  /**
   * Total de cada estágio numa janela qualquer.
   *
   * O volume é proporcional à duração (uma janela de 30 dias tem ~1/3 do
   * trimestre), MODULADO pelo fator da própria janela. Sem o fator, toda
   * comparação período-a-período daria 0% — e a variação é uma informação
   * central da tela.
   *
   * O fator depende só das datas: a mesma janela devolve sempre o mesmo total.
   * É o que torna a pill verificável — pedir "últimos 30 dias" e depois recuar
   * para a janela com que ele se compara mostra números coerentes com a
   * variação que estava na tela.
   */
  function totalsFor(startDate, endDate, isDemo) {
    const days = daysBetween(startDate, endDate)
    const totals = {}

    if (isDemo) {
      // A janela padrão usa os valores exatos da tela real.
      Object.keys(DEMO_STAGES).forEach(key => {
        totals[key] = DEMO_STAGES[key]
      })
      return totals
    }

    // A janela ANTERIOR da padrão também é fixa: é contra ela que as pills da
    // tela real comparam (+9,34% leads, −13,16% vendas...). Sem este ramo, o
    // primeiro carregamento mostraria as variações exatas e a mesma janela
    // reaberta pelo seletor mostraria outras.
    const demo = defaultRange()
    const demoPrevious = previousPeriod(demo.startDate, demo.endDate)
    if (startDate === demoPrevious.startDate && endDate === demoPrevious.endDate) {
      Object.keys(DEMO_PREVIOUS_STAGES).forEach(key => {
        totals[key] = DEMO_PREVIOUS_STAGES[key]
      })
      return totals
    }

    Object.keys(DEMO_STAGES).forEach(key => {
      totals[key] = Math.round((DEMO_STAGES[key] * days * windowFactor(startDate, endDate, key)) / DEMO_DAYS)
    })
    return totals
  }

  function variationPct(current, previous) {
    if (!previous) return null
    return +(((current - previous) / previous) * 100).toFixed(2)
  }

  /**
   * Total de visitantes numa janela qualquer.
   *
   * Gêmea de `totalsFor`, com as mesmas duas exceções fixas (a janela padrão e
   * a janela anterior dela) — é o que permite a pill "+7,63%" bater com o card
   * quando o usuário seleciona o período comparado.
   */
  function visitorsFor(startDate, endDate) {
    const demo = defaultRange()
    if (startDate === demo.startDate && endDate === demo.endDate) return DEMO_VISITORS.total

    const demoPrevious = previousPeriod(demo.startDate, demo.endDate)
    if (startDate === demoPrevious.startDate && endDate === demoPrevious.endDate) {
      return DEMO_VISITORS.previousTotal
    }

    const days = daysBetween(startDate, endDate)
    // Fator de janela PRÓPRIO dos visitantes: o GA é uma fonte diferente do
    // funil, então o tráfego de uma janela não se move junto com os leads.
    return Math.round((DEMO_VISITORS.total * days * windowFactor(startDate, endDate, 'visitors')) / DEMO_DAYS)
  }

  function load(startDate, endDate) {
    const demo = defaultRange()
    const isDemo = startDate === demo.startDate && endDate === demo.endDate
    const days = daysBetween(startDate, endDate)
    const previous = previousPeriod(startDate, endDate)
    const totals = totalsFor(startDate, endDate, isDemo)
    const previousTotals = totalsFor(previous.startDate, previous.endDate, isDemo)

    // Cards do funil: totais do período e variação contra a janela anterior.
    const stageMeta = [
      { id: 'leads', key: 'leads' },
      { id: 'qualified_leads', key: 'qualified_leads' },
      { id: 'opportunities', key: 'opportunities' },
      { id: 'sales', key: 'sales' },
    ]

    // `previousValue` é o total que a MESMA série teria na janela anterior de
    // mesma duração — não um número sorteado à parte. Assim a comparação é
    // verificável: se o usuário selecionar aquela janela no seletor, os cards
    // vão mostrar exatamente os valores que as pills estão comparando.
    const stages = stageMeta.map(meta => {
      const value = totals[meta.key]
      const previousValue = isDemo
        ? DEMO_PREVIOUS_STAGES[meta.key]
        : previousTotals[meta.key]
      return {
        id: meta.id,
        key: meta.key,
        value,
        previousValue,
        variationPct: variationPct(value, previousValue),
      }
    })

    // Sparkline dos cards: buckets mensais (o traço de 3 meses) e a série
    // diária que alimenta o eixo de dia em períodos curtos.
    const byMonth = buildMonths(startDate, endDate, totals, isDemo)

    // Uma série diária só serve aos dois usos: o sparkline dos períodos curtos
    // e o gráfico "Evolução por dia". Ver o comentário de `buildDailyFunnel`.
    const dailyFunnel = buildDailyFunnel(startDate, endDate, totals)

    // Visitantes seguem a MESMA regra dos estágios do funil: o total da janela
    // (inclusive quando essa janela é a anterior de outra), para que a pill de
    // um período e o card exibido naquele período não se contradigam.
    const visitorsTotal = isDemo
      ? DEMO_VISITORS.total
      : visitorsFor(startDate, endDate)
    // Mesma regra dos estágios do funil: o anterior é o total que a própria
    // série teria naquela janela, não um valor à parte.
    const visitorsPrevious = isDemo
      ? DEMO_VISITORS.previousTotal
      : visitorsFor(previous.startDate, previous.endDate)

    const visitorsDay = buildVisitors(startDate, endDate, visitorsTotal, isDemo)

    const conversionTotals = {
      conversions: isDemo
        ? DEMO_CONVERSIONS.total
        : Math.round((DEMO_CONVERSIONS.total * days * windowFactor(startDate, endDate, 'conversions')) / DEMO_DAYS),
      opportunities: isDemo
        ? DEMO_CONVERSIONS.opportunities
        : Math.round(
            (DEMO_CONVERSIONS.opportunities * days * windowFactor(startDate, endDate, 'conv-opportunities')) /
              DEMO_DAYS,
          ),
      customers: isDemo
        ? DEMO_CONVERSIONS.customers
        : Math.round((DEMO_CONVERSIONS.customers * days * windowFactor(startDate, endDate, 'customers')) / DEMO_DAYS),
    }
    const conversionsDay = buildConversions(startDate, endDate, conversionTotals)

    // Faixa esperada: só faz sentido até 93 dias (o preset de 3 meses).
    const bandsAllowed = days <= 93
    let bands = []
    if (bandsAllowed) {
      if (isDemo) {
        bands = DEMO_BANDS
      } else {
        const baselineWindows = [1, 2, 3].map(offset => {
          const windowEnd = addDays(startDate, -(days * (offset - 1)) - 1)
          const windowStart = addDays(windowEnd, -(days - 1))
          return totalsFor(windowStart, windowEnd, false)
        })
        bands = buildBands(totals, baselineWindows)
      }
    }

    return {
      isDemo,
      period: {
        startDate,
        endDate,
        previousStartDate: previous.startDate,
        previousEndDate: previous.endDate,
      },
      days,
      funnel: {
        stages,
        // Mesma série diária para o gráfico e para o sparkline curto.
        byDay: dailyFunnel,
        byMonth,
      },
      visitors: {
        connected: true,
        total: visitorsTotal,
        previousTotal: visitorsPrevious,
        variationPct: variationPct(visitorsTotal, visitorsPrevious),
        byDay: visitorsDay,
      },
      conversions: {
        qualifiedLeads: {
          value: isDemo
            ? DEMO_CONVERSIONS.qualifiedLeads
            : Math.round(conversionTotals.conversions * 0.252),
        },
        opportunities: { value: conversionTotals.opportunities },
        byDay: conversionsDay,
      },
      bands,
      bandsAllowed,
      email: buildEmail(startDate, endDate, isDemo),
    }
  }

  window.PocData = {
    defaultRange,
    previousPeriod,
    presetRange,
    PRESET_GROUPS,
    PICKER_MIN_DATE,
    load,
    daysBetween,
    eachDay,
    toDate,
    toISO,
    addDays,
    startOfMonth,
    shiftMonths,
  }
})()
