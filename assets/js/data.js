// Dados sintéticos do POC do Centralizador.
//
// Reproduz o contrato e a leitura da tela do MFE (`analysis-centralizer`), sem
// nenhuma chamada de rede: a página é estática (GitHub Pages).
//
// Princípio: toda série fecha com o número que ela alimenta.
//
//   - o total de cada estágio é o valor do card E a soma dos pontos diários do
//     gráfico (na tela real as duas leituras vêm de granularidades diferentes e
//     não fecham — artefato da fake API, não do produto);
//   - a pill de variação compara com a janela anterior, e essa janela, se
//     selecionada no seletor, devolve exatamente os valores que a pill mostrou;
//   - as taxas de conversão são a razão exata dos totais dos cards;
//   - os cards e a tabela de email usam as mesmas origens.
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

  // Janela da sobreposição "Comparar": no mês corrente a referência é o mês
  // anterior FECHADO; nas demais janelas, a mesma duração imediatamente antes.
  function isMonthToDate(period) {
    const { startDate, endDate } = period ?? {}
    if (!startDate || !endDate) return false
    return (
      startDate.slice(8, 10) === '01' &&
      startDate.slice(0, 7) === endDate.slice(0, 7)
    )
  }

  function comparisonRange(startDate, endDate) {
    if (!startDate || !endDate) return null
    if (isMonthToDate({ startDate, endDate })) {
      const first = startOfMonth(shiftMonths(startDate, -1))
      const last = addDays(startOfMonth(startDate), -1)
      return { startDate: first, endDate: last }
    }
    return previousPeriod(startDate, endDate)
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

  function splitByDay(dates, total, seedText) {
    const weights = dates.map(date => {
      const rand = seededRandom(`${seedText}:${date}`)
      return weekdayFactor(date) * (0.84 + rand() * 0.32)
    })
    return scaleToTotal(weights, total)
  }

  // ─── Números da janela padrão ──────────────────────────────────────────────
  // Os valores da tela real com "Últimos 3 meses" aberto em 11/11/2026.
  const DEMO_DAYS = 93

  const DEMO_STAGES = {
    leads: 10464,
    qualified_leads: 3646,
    opportunities: 1240,
    sales: 278,
  }

  const DEMO_PREVIOUS_STAGES = {
    leads: 11885,
    qualified_leads: 4238,
    opportunities: 1243,
    sales: 401,
  }

  // Médias diárias que calibram QUALQUER outra janela. Uma janela de 30 dias
  // tem ~1/3 do trimestre, modulada por um fator próprio (±10%) para as
  // variações não serem todas 0%.
  const STAGE_PER_DAY = {
    leads: DEMO_STAGES.leads / DEMO_DAYS,
    qualified_leads: DEMO_STAGES.qualified_leads / DEMO_DAYS,
    opportunities: DEMO_STAGES.opportunities / DEMO_DAYS,
    sales: DEMO_STAGES.sales / DEMO_DAYS,
  }

  const DEMO_VISITORS = { total: 189930, previousTotal: 171522 }
  const VISITORS_PER_DAY = DEMO_VISITORS.total / DEMO_DAYS

  // Totais do gráfico "Conversões durante o tempo" (a soma dos dias é o
  // número do controle de série). `qualifiedLeads` é o card de cima e tem
  // base própria, como na tela real.
  const DEMO_CONVERSIONS = {
    conversions: 7218,
    opportunities: 1179,
    customers: 395,
    qualifiedLeads: 1830,
  }

  const CONVERSION_PER_DAY = {
    conversions: DEMO_CONVERSIONS.conversions / DEMO_DAYS,
    opportunities: DEMO_CONVERSIONS.opportunities / DEMO_DAYS,
    customers: DEMO_CONVERSIONS.customers / DEMO_DAYS,
  }

  // Faixa da janela padrão — os números da tela real: 34,8% em [35,4; 37,3]
  // (abaixo), 34,0% em [29,6; 32,6] (acima) e 22,4% em [27,9; 33,0] (abaixo).
  const DEMO_BANDS = [
    { id: 'qualification', baseline: 0.3635, low: 0.354, high: 0.373 },
    { id: 'opportunity', baseline: 0.311, low: 0.296, high: 0.326 },
    { id: 'win', baseline: 0.3045, low: 0.279, high: 0.33 },
  ]

  // ─── Funil diário ──────────────────────────────────────────────────────────
  // Reparte o total de cada estágio pelos dias do período. A soma devolve
  // EXATAMENTE o total recebido.
  const STAGE_KEYS = ['leads', 'qualified_leads', 'opportunities', 'sales']

  function buildDailyFunnel(startDate, endDate, totals) {
    const dates = eachDay(startDate, endDate)
    const split = {}
    STAGE_KEYS.forEach(key => {
      split[key] = splitByDay(dates, totals[key], key)
    })
    return dates.map((date, i) => ({
      date,
      leads: split.leads[i],
      qualified_leads: split.qualified_leads[i],
      opportunities: split.opportunities[i],
      sales: split.sales[i],
    }))
  }

  // ─── Visitantes ────────────────────────────────────────────────────────────
  // Distribui o total entre os dias com sessão. O GA devolve só os dias com
  // visita; aqui omitimos ~1 dia em 9 para o join por data ter o mesmo buraco
  // que tem em produção.
  function buildVisitors(startDate, endDate, total) {
    const visible = []
    eachDay(startDate, endDate).forEach(date => {
      const rand = seededRandom(`visitors:${date}`)
      if (rand() < 0.11) return
      visible.push({ date, weight: weekdayFactor(date) * (0.55 + rand() * 1.1) })
    })
    if (!visible.length) {
      // Janela de 1 dia que caiu no sorteio de "sem sessão": o total do card
      // ainda precisa ter onde aparecer, então o único dia recebe a série.
      return total > 0 ? [{ date: startDate, visitors: total }] : []
    }

    const values = scaleToTotal(
      visible.map(row => row.weight),
      total,
    )
    return visible
      .map((row, i) => ({ date: row.date, visitors: values[i] }))
      .filter(row => row.visitors > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
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
  // Nove origens (5 campanhas + 4 automações) fechando exatamente os totais da
  // tela real: 33.616 envios, 32.198 entregas, 9.133 aberturas, 1.676 cliques.
  const DEMO_EMAIL_ORIGINS = [
    { name: 'Newsletter mensal', type: 'campaign', sent: 3261, delivered: 3219, opened: 1024, clicked: 122, sentAt: '2026-11-08' },
    { name: 'Lançamento de produto', type: 'campaign', sent: 3184, delivered: 2982, opened: 562, clicked: 134, sentAt: '2026-10-14' },
    { name: 'Convite para webinar', type: 'campaign', sent: 5729, delivered: 5421, opened: 2267, clicked: 407, sentAt: '2026-10-02' },
    { name: 'Black Friday', type: 'campaign', sent: 4099, delivered: 4000, opened: 789, clicked: 87, sentAt: '2026-08-29' },
    { name: 'Reengajamento de base', type: 'campaign', sent: 5300, delivered: 5082, opened: 1098, clicked: 306, sentAt: '2026-10-20' },
    { name: 'Fluxo de boas-vindas', type: 'workflow', sent: 3378, delivered: 3150, opened: 517, clicked: 69, sentAt: null },
    { name: 'Nutrição de leads', type: 'workflow', sent: 4175, delivered: 4086, opened: 1560, clicked: 389, sentAt: null },
    { name: 'Carrinho abandonado', type: 'workflow', sent: 2300, delivered: 2180, opened: 700, clicked: 80, sentAt: null },
    { name: 'Pós-venda', type: 'workflow', sent: 2190, delivered: 2078, opened: 616, clicked: 82, sentAt: null },
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
      origins = DEMO_EMAIL_ORIGINS.map((row, index) => ({
        ...row,
        id: `${row.type}-${index + 1}`,
      }))
    } else {
      const campaignCount = Math.max(1, Math.min(CAMPAIGN_NAMES.length, Math.round(days / 20)))
      const volume = 4000 * (days / DEMO_DAYS)
      const originOf = (type, name, index) => {
        const sent = Math.round(volume * (0.4 + rand() * 1.2))
        const delivered = Math.round(sent * (0.93 + rand() * 0.06))
        const opened = Math.round(delivered * (0.15 + rand() * 0.3))
        const clicked = Math.round(opened * (0.08 + rand() * 0.2))
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
        ...WORKFLOW_NAMES.map((name, i) => originOf('workflow', name, i)),
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
    { id: 'qualification', numerator: 'qualified_leads', denominator: 'leads' },
    { id: 'opportunity', numerator: 'opportunities', denominator: 'qualified_leads' },
    { id: 'win', numerator: 'sales', denominator: 'opportunities' },
  ]

  function proportionBand(baseline, trials, z = 1.96) {
    if (trials <= 0) return { low: 0, high: 1 }
    const clamped = Math.min(1, Math.max(0, baseline))
    const error = Math.sqrt((clamped * (1 - clamped)) / trials)
    return { low: Math.max(0, clamped - z * error), high: Math.min(1, clamped + z * error) }
  }

  function ratesOf(totals) {
    return {
      qualification: totals.leads > 0 ? totals.qualified_leads / totals.leads : null,
      opportunity: totals.qualified_leads > 0 ? totals.opportunities / totals.qualified_leads : null,
      win: totals.opportunities > 0 ? totals.sales / totals.opportunities : null,
    }
  }

  function classify(observed, limits, trials) {
    if (trials < 10) return 'insuficiente'
    if (observed < limits.low) return 'abaixo'
    if (observed > limits.high) return 'acima'
    return 'dentro'
  }

  function buildBands(totals, baselineTotals) {
    const observedRates = ratesOf(totals)
    return BAND_RATE_DEFS.map(def => {
      const observed = observedRates[def.id]
      const trials = totals[def.denominator] ?? 0
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
      return {
        id: def.id,
        observed,
        trials,
        baseline,
        low: limits.low,
        high: limits.high,
        band: classify(observed, limits, trials),
      }
    })
  }

  function demoBands(totals) {
    const observedRates = ratesOf(totals)
    return BAND_RATE_DEFS.map(def => {
      const fixed = DEMO_BANDS.find(item => item.id === def.id)
      const observed = observedRates[def.id]
      const trials = totals[def.denominator] ?? 0
      return {
        id: def.id,
        observed,
        trials,
        baseline: fixed.baseline,
        low: fixed.low,
        high: fixed.high,
        band: classify(observed, fixed, trials),
      }
    })
  }

  // ─── Totais de uma janela qualquer ─────────────────────────────────────────
  // Fator determinístico de uma janela: 0,90 a 1,10 (±10%), estável por datas
  // e por métrica. É o que faz duas janelas de mesma duração terem volumes
  // diferentes (e, portanto, variações diferentes de zero).
  function windowFactor(startDate, endDate, metric) {
    return 0.9 + seededRandom(`window:${metric}:${startDate}:${endDate}`)() * 0.2
  }

  function totalsFor(startDate, endDate, isDemo) {
    if (isDemo) return { ...DEMO_STAGES }

    // A janela anterior da padrão também é fixa: é contra ela que as pills
    // comparam. Sem este ramo, selecionar a janela anterior no seletor
    // mostraria números diferentes dos que a pill acabou de exibir.
    const demo = defaultRange()
    const demoPrevious = previousPeriod(demo.startDate, demo.endDate)
    if (startDate === demoPrevious.startDate && endDate === demoPrevious.endDate) {
      return { ...DEMO_PREVIOUS_STAGES }
    }

    const days = daysBetween(startDate, endDate)
    const totals = {}
    STAGE_KEYS.forEach(key => {
      totals[key] = Math.round(STAGE_PER_DAY[key] * days * windowFactor(startDate, endDate, key))
    })
    return totals
  }

  function visitorsFor(startDate, endDate) {
    const demo = defaultRange()
    if (startDate === demo.startDate && endDate === demo.endDate) return DEMO_VISITORS.total

    const demoPrevious = previousPeriod(demo.startDate, demo.endDate)
    if (startDate === demoPrevious.startDate && endDate === demoPrevious.endDate) {
      return DEMO_VISITORS.previousTotal
    }

    const days = daysBetween(startDate, endDate)
    return Math.round(VISITORS_PER_DAY * days * windowFactor(startDate, endDate, 'visitors'))
  }

  function conversionsFor(startDate, endDate, isDemo) {
    if (isDemo) {
      return {
        conversions: DEMO_CONVERSIONS.conversions,
        opportunities: DEMO_CONVERSIONS.opportunities,
        customers: DEMO_CONVERSIONS.customers,
        qualifiedLeads: DEMO_CONVERSIONS.qualifiedLeads,
      }
    }
    const days = daysBetween(startDate, endDate)
    const total = key => Math.round(CONVERSION_PER_DAY[key] * days * windowFactor(startDate, endDate, key))
    return {
      conversions: total('conversions'),
      opportunities: total('opportunities'),
      customers: total('customers'),
      qualifiedLeads: Math.round(
        ((DEMO_CONVERSIONS.qualifiedLeads * days) / DEMO_DAYS) * windowFactor(startDate, endDate, 'qualified-leads'),
      ),
    }
  }

  function variationPct(current, previous) {
    if (!previous) return null
    return +(((current - previous) / previous) * 100).toFixed(2)
  }

  // ─── Montagem de um período ────────────────────────────────────────────────
  const CONVERSION_BANDS_MAX_DAYS = 93

  function load(startDate, endDate) {
    const demo = defaultRange()
    const isDemo = startDate === demo.startDate && endDate === demo.endDate
    const days = daysBetween(startDate, endDate)
    const previous = previousPeriod(startDate, endDate)
    const totals = totalsFor(startDate, endDate, isDemo)
    const previousTotals = totalsFor(previous.startDate, previous.endDate, false)

    const stages = STAGE_KEYS.map(key => {
      const value = totals[key]
      const previousValue = isDemo ? DEMO_PREVIOUS_STAGES[key] : previousTotals[key]
      return {
        id: key,
        value,
        previousValue,
        variationPct: variationPct(value, previousValue),
      }
    })

    const visitorsTotal = isDemo ? DEMO_VISITORS.total : visitorsFor(startDate, endDate)
    const visitorsPrevious = isDemo
      ? DEMO_VISITORS.previousTotal
      : visitorsFor(previous.startDate, previous.endDate)

    const conversionTotals = conversionsFor(startDate, endDate, isDemo)

    const bandsAllowed = days > 0 && days <= CONVERSION_BANDS_MAX_DAYS
    let bands = []
    if (bandsAllowed) {
      if (isDemo) {
        bands = demoBands(totals)
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
      stages,
      // Série diária do funil: alimenta o gráfico de desempenho.
      byDay: buildDailyFunnel(startDate, endDate, totals),
      visitors: {
        connected: true,
        total: visitorsTotal,
        previousTotal: visitorsPrevious,
        variationPct: variationPct(visitorsTotal, visitorsPrevious),
        byDay: buildVisitors(startDate, endDate, visitorsTotal),
      },
      conversions: {
        qualifiedLeads: { value: conversionTotals.qualifiedLeads },
        opportunities: { value: conversionTotals.opportunities },
        byDay: buildConversions(startDate, endDate, conversionTotals),
      },
      bands,
      bandsAllowed,
      email: buildEmail(startDate, endDate, isDemo),
    }
  }

  window.PocData = {
    defaultRange,
    previousPeriod,
    comparisonRange,
    isMonthToDate,
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
