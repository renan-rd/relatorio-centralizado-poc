// Página estática do Painel de marketing — toda a interação em JS puro.
//
// Reproduz a tela do MFE (`analysis-centralizer`) com os mesmos textos, ordem
// dos blocos e regras de apresentação:
//
//   - funil (visitantes + 4 estágios) com sparkline e comparação;
//   - evolução por dia, com séries ligáveis;
//   - faixa esperada das taxas de conversão;
//   - conversões (dois números + gráfico);
//   - campanhas e automações de email (8 cards + 3 abas de tabela).
//
// Nenhuma chamada de rede: os dados vêm de `data.js` (sintéticos).
(function () {
  'use strict'

  const { integer, percent, date } = window.PocCharts.formats
  const data = window.PocData

  // ─── Textos (os mesmos do locale pt-BR do MFE) ─────────────────────────────
  const T = {
    kpi_previous_period: 'no período anterior',
    kpi_no_variation: 'Sem variação',
    kpi_single_value: 'Dados insuficientes para exibir a evolução em gráfico.',
    stage_leads: 'Leads',
    stage_leads_help: 'Total de novos contatos gerados no período selecionado.',
    stage_qualified: 'Qualificados',
    stage_qualified_help:
      'Contatos que tiveram seu estágio alterado para lead qualificado no período selecionado.',
    stage_opportunities: 'Oportunidades',
    stage_opportunities_help:
      'Contatos marcados como oportunidade no Marketing no período selecionado.',
    stage_sales: 'Vendas',
    stage_sales_help: 'Contatos com vendas registradas no Marketing no período selecionado.',
    stage_visits: 'Visitantes',
    stage_visits_help: 'Pessoas que visitaram o site no período, pelo Google Analytics.',
    visitors_not_connected:
      'Esta conta não tem uma integração com o Google Analytics conectada, então não há dados de visitantes para exibir.',
    source: (start, end) => `Período de ${start} a ${end}.`,
    source_comparison: (start, end, prevStart, prevEnd) =>
      `Período de ${start} a ${end}, comparado a ${prevStart} a ${prevEnd}.`,
    daily_title: 'Evolução por dia',
    daily_help:
      'Acompanhe dia a dia o volume de leads, qualificados, oportunidades e vendas.',
    daily_period: (start, end) => `Período de ${start} a ${end}.`,
    daily_none: 'Selecione ao menos uma série para comparar.',
    daily_widens_scale:
      'A escala do eixo acompanha o volume de visitantes; as demais séries ficam achatadas.',
    series_visitors: 'Visitantes',
    series_leads: 'Leads',
    series_qualified: 'Leads qualificados',
    series_opportunities: 'Oportunidades',
    series_sales: 'Vendas',
    bands_title: 'Faixa esperada das taxas de conversão',
    bands_subtitle: 'Mostra se a conversão deste período está no ritmo habitual da sua conta.',
    bands_limit: 'Selecione um período de até 3 meses.',
    band_rate_qualification: 'Taxa de qualificação',
    band_rate_opportunity: 'Taxa de oportunidade',
    band_rate_win: 'Taxa de conversão em venda',
    band_dentro: 'Dentro do esperado',
    band_acima: 'Acima do esperado',
    band_abaixo: 'Abaixo do esperado',
    band_insuficiente: 'Evidência insuficiente',
    band_note: (low, high) => `Faixa esperada de ${low} a ${high}.`,
    band_note_help:
      'Analisamos os resultados da sua conta nos 3 períodos anteriores, de mesma duração do período selecionado.',
    band_note_insufficient: trials =>
      `Amostra pequena para classificar (${integer.format(trials)} no denominador). Não é erro — é cedo para dizer se está dentro ou fora do normal.`,
    conv_qualified_title: 'Conversões de leads qualificados',
    conv_qualified_hint:
      'Eventos em que contatos atingiram o estágio de Lead Qualificado no período selecionado.',
    conv_opportunities_title: 'Conversões de oportunidades',
    conv_opportunities_hint:
      'Total de eventos em que contatos foram marcados como Oportunidade no período selecionado.',
    conv_over_time_title: 'Conversões durante o tempo',
    conv_over_time_hint:
      'Volume diário de interações de conversão, oportunidades marcadas e clientes conquistados.',
    conv_series_leads: 'Conversões dos leads',
    conv_series_opportunities: 'Oportunidades',
    conv_series_customers: 'Clientes',
    conv_over_time_aria: (start, end) =>
      `Conversões por dia de ${start} a ${end}: leads, oportunidades e clientes.`,
    email_title: 'Campanhas e automações de email',
    email_help:
      'Desempenho dos e-mails disparados tanto em campanhas pontuais quanto em fluxos de automação.',
    email_period: (start, end) => `Período de ${start} a ${end}.`,
    email_scope_note:
      'Dados consolidados das campanhas e automações do período selecionado. As taxas consideram eventos de e-mail e não contatos únicos, o que pode fazer os valores passarem de 100%.',
    email_metric_campaign_count: 'E-mails',
    email_metric_campaign_count_help:
      'Quantidade de e-mails enviados por campanhas e automações no período selecionado.',
    email_metric_sent: 'Total de envios',
    email_metric_sent_help:
      'Total de disparos individuais de e-mails em campanhas e automações no período selecionado.',
    email_metric_delivered: 'Total de entregas',
    email_metric_delivered_help:
      'Total de e-mails que chegaram com sucesso ao destinatário no período selecionado.',
    email_metric_unique_opens: 'Aberturas',
    email_metric_unique_opens_help:
      'Total de aberturas de e-mails registradas no período selecionado.',
    email_metric_open_rate: 'Taxa de abertura',
    email_metric_open_rate_help:
      'Percentual de aberturas por entrega. Pode passar de 100% se houver aberturas repetidas.',
    email_metric_unique_clicks: 'Cliques',
    email_metric_unique_clicks_help:
      'Total de cliques em links dos e-mails registrados no período selecionado.',
    email_metric_click_rate: 'Taxa de cliques',
    email_metric_click_rate_help:
      'Percentual de cliques por entrega. Pode passar de 100% se houver múltiplos cliques.',
    email_metric_unique_bounces: 'Bounces',
    email_metric_unique_bounces_help:
      'E-mails que não puderam ser entregues por erro no endereço ou rejeição pelo servidor de destino.',
    email_tab_sends: 'Maiores envios',
    email_tab_recent: 'Últimas campanhas',
    email_tab_clicks: 'Maiores cliques',
    email_sends_title: '5 campanhas com mais envios',
    email_recent_title: 'Resultados das últimas 5 campanhas',
    email_clicks_title: '5 campanhas com mais cliques',
    email_empty_generic: 'Nenhuma campanha com dados neste recorte para o período selecionado.',
    email_empty_recent:
      'Esta conta não expõe a data de envio das campanhas, então não é possível listar as últimas.',
    email_col_campaign: 'Campanha',
    email_col_type: 'Tipo',
    email_col_sent_at: 'Enviada em',
    email_col_sent: 'Enviados',
    email_col_delivered: 'Entregues',
    email_col_opened: 'Aberturas',
    email_col_open_rate: 'Tx. abertura',
    email_col_clicked: 'Cliques',
    email_col_click_rate: 'Tx. cliques',
    email_type_campaign: 'Campanha',
    email_type_workflow: 'Automação',
    email_report_period: (start, end) => `Período de ${start} a ${end}.`,
    email_caption: 'Campanhas de email do período',
    period_label: 'Período',
    period_group: 'Períodos',
    period_today: 'Hoje',
    period_this_week: 'Esta semana',
    period_this_month: 'Este mês',
    period_last_7: 'Últimos 7 dias',
    period_last_14: 'Últimos 14 dias',
    period_last_30: 'Últimos 30 dias',
    period_last_3_months: 'Últimos 3 meses',
    period_custom: 'Período personalizado',
    period_apply: 'Aplicar',
    period_prev_month: 'Mês anterior',
    period_next_month: 'Próximo mês',
  }

  const PRESET_LABELS = {
    today: T.period_today,
    this_week: T.period_this_week,
    this_month: T.period_this_month,
    last_7: T.period_last_7,
    last_14: T.period_last_14,
    last_30: T.period_last_30,
    last_3_months: T.period_last_3_months,
  }

  const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  // ─── Ícones (mesmo desenho do tangram-react-icons) ─────────────────────────
  const ICONS = {
    question:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-9-9c0-4.969 4.03-9 9-9s9 4.031 9 9zm-8.758-6.024c-1.978 0-3.24.833-4.23 2.314a.436.436 0 00.098.59l1.26.954c.189.144.458.11.604-.077.649-.822 1.093-1.299 2.08-1.299.741 0 1.658.477 1.658 1.196 0 .544-.448.823-1.18 1.233-.854.479-1.984 1.075-1.984 2.565v.145c0 .24.195.435.436.435h2.032c.24 0 .436-.195.436-.435v-.049c0-1.033 3.019-1.075 3.019-3.87 0-2.105-2.184-3.702-4.23-3.702zm-.242 9c-.92 0-1.67.749-1.67 1.67 0 .92.75 1.668 1.67 1.668.92 0 1.67-.748 1.67-1.669 0-.92-.75-1.67-1.67-1.67z"/></svg>',
    caretDown:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.54 10h6.92c.48 0 .72.639.381 1.012l-3.46 3.814a.504.504 0 01-.761 0l-3.461-3.814c-.34-.373-.1-1.012.38-1.012z"/></svg>',
    chevronRight:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.09 12.466l-5.341 5.34a.66.66 0 01-.933 0l-.623-.622a.66.66 0 010-.932L12.424 12 8.192 7.748a.66.66 0 01.001-.932l.623-.623a.66.66 0 01.933 0l5.34 5.34a.66.66 0 010 .933z"/></svg>',
    chevronLeft:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.91 12.466l5.341 5.34a.66.66 0 00.933 0l.623-.622a.66.66 0 000-.932L10.576 12l4.233-4.252a.66.66 0 00-.001-.932l-.623-.623a.66.66 0 00-.933 0l-5.34 5.34a.66.66 0 000 .933z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.114 18.16l-5.85-5.85a.9.9 0 010-1.274l1.272-1.272a.9.9 0 011.273 0l3.941 3.94 8.44-8.44a.9.9 0 011.274 0l1.272 1.272a.9.9 0 010 1.273l-10.35 10.35a.9.9 0 01-1.272 0z"/></svg>',
    warning:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5a1.6 1.6 0 011.39.8l9 15.6A1.6 1.6 0 0121 21.5H3a1.6 1.6 0 01-1.39-2.6l9-15.6A1.6 1.6 0 0112 2.5zm0 5a1 1 0 00-1 1v5a1 1 0 002 0v-5a1 1 0 00-1-1zm0 9.75a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z"/></svg>',
  }

  // ─── Helpers de DOM ────────────────────────────────────────────────────────
  function h(tag, attrs, children) {
    const node = document.createElement(tag)
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return
        if (key === 'class') node.className = value
        else if (key === 'html') node.innerHTML = value
        else if (key === 'text') node.textContent = value
        else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value)
        else node.setAttribute(key, value)
      })
    }
    ;(children || []).forEach(child => {
      if (child === null || child === undefined) return
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
    return node
  }

  function helpButton(text) {
    return h('div', { class: 'metric-help-wrap' }, [
      h('button', {
        class: 'metric-help',
        type: 'button',
        'aria-label': text,
        html: ICONS.question,
      }),
      h('div', { class: 'tooltip', role: 'tooltip', html: `<span>${text}</span>` }),
    ])
  }

  function blockTitle(title, help, level) {
    return h('div', { class: 'block-title' }, [
      h(level || 'h3', { text: title }),
      help ? helpButton(help) : null,
    ])
  }

  const fmtDate = iso => date(iso)

  // ─── Seletor de período ────────────────────────────────────────────────────
  // Nível 1 = atalhos; nível 2 = calendário + Aplicar. Presets aplicam no
  // clique; o período personalizado só no "Aplicar" (um intervalo é escolhido
  // em duas etapas).
  function createPeriodPicker(container, state, onChange) {
    const now = new Date()
    const todayIso = data.toISO(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)))

    let open = false
    let level = 'root'
    let calendarMonth = data.startOfMonth(state.endDate)
    let draft = { start: state.startDate, end: state.endDate }

    const activePreset = () => {
      for (const group of data.PRESET_GROUPS) {
        for (const id of group) {
          const preset = data.presetRange(id, todayIso)
          if (preset.startDate === state.startDate && preset.endDate === state.endDate) return id
        }
      }
      return null
    }

    const shortDate = iso => (iso ? fmtDate(iso) : '—')

    function close() {
      open = false
      level = 'root'
      render()
    }

    function applyRange(range) {
      onChange(range)
      close()
    }

    function renderMenu() {
      if (level === 'root') {
        const menu = h('div', { class: 'period-menu', role: 'listbox', 'aria-label': T.period_label })

        menu.appendChild(h('div', { class: 'period-group-title', text: T.period_group }))
        data.PRESET_GROUPS[0].forEach(id => {
          menu.appendChild(
            h('button', {
              class: 'period-option',
              type: 'button',
              role: 'option',
              'aria-checked': String(activePreset() === id),
              text: PRESET_LABELS[id],
              onclick: () => applyRange(data.presetRange(id, todayIso)),
            }),
          )
        })
        menu.appendChild(h('hr', { class: 'period-divider' }))
        data.PRESET_GROUPS[1].forEach(id => {
          menu.appendChild(
            h('button', {
              class: 'period-option',
              type: 'button',
              role: 'option',
              'aria-checked': String(activePreset() === id),
              text: PRESET_LABELS[id],
              onclick: () => applyRange(data.presetRange(id, todayIso)),
            }),
          )
        })
        menu.appendChild(h('hr', { class: 'period-divider' }))
        menu.appendChild(
          h(
            'button',
            {
              class: 'period-option',
              type: 'button',
              role: 'option',
              'aria-checked': 'false',
              onclick: () => {
                level = 'custom'
                draft = { start: state.startDate, end: state.endDate }
                calendarMonth = data.startOfMonth(state.endDate)
                render()
              },
            },
            [
              h('span', { text: T.period_custom }),
              h('span', { class: 'period-option__spacer' }),
              h('span', { html: ICONS.chevronRight, 'aria-hidden': 'true' }),
            ],
          ),
        )
        return menu
      }

      // Nível 2: calendário.
      const menu = h('div', {
        class: 'period-menu period-menu--calendar',
        role: 'dialog',
        'aria-label': T.period_custom,
      })

      menu.appendChild(
        h(
          'button',
          {
            class: 'period-back',
            type: 'button',
            onclick: () => {
              level = 'root'
              render()
            },
          },
          [h('span', { html: ICONS.chevronLeft, 'aria-hidden': 'true' }), h('span', { text: T.period_custom })],
        ),
      )

      const [year, month] = calendarMonth.split('-').map(Number)
      const monthStart = `${calendarMonth.slice(0, 7)}-01`
      const gridStart = data.addDays(monthStart, -data.toDate(monthStart).getUTCDay())

      const header = h('div', { class: 'calendar__header' }, [
        h('button', {
          class: 'calendar__nav',
          type: 'button',
          'aria-label': T.period_prev_month,
          html: ICONS.chevronLeft,
          onclick: () => {
            calendarMonth = data.startOfMonth(data.shiftMonths(monthStart, -1))
            render()
          },
        }),
        h('span', { class: 'calendar__month', text: `${MONTHS[month - 1]} ${year}` }),
        h('button', {
          class: 'calendar__nav',
          type: 'button',
          'aria-label': T.period_next_month,
          html: ICONS.chevronRight,
          // Não dá para navegar para além do mês corrente (não há dado futuro).
          disabled: monthStart >= data.startOfMonth(todayIso),
          onclick: () => {
            calendarMonth = data.startOfMonth(data.shiftMonths(monthStart, 1))
            render()
          },
        }),
      ])

      const grid = h('div', { class: 'calendar__grid' })
      WEEKDAYS.forEach(day => grid.appendChild(h('div', { class: 'calendar__dow', text: day })))

      for (let i = 0; i < 42; i += 1) {
        const iso = data.addDays(gridStart, i)
        const outside = !iso.startsWith(calendarMonth.slice(0, 7))
        const classes = ['calendar__day']
        if (outside) classes.push('calendar__day--outside')
        if (draft.start && draft.end && iso > draft.start && iso < draft.end) {
          classes.push('calendar__day--in-range')
        }
        if (iso === draft.start || iso === draft.end) classes.push('calendar__day--edge')

        grid.appendChild(
          h('button', {
            class: classes.join(' '),
            type: 'button',
            text: String(data.toDate(iso).getUTCDate()),
            disabled: iso > todayIso || iso < data.PICKER_MIN_DATE,
            'aria-label': fmtDate(iso),
            'aria-pressed': String(iso === draft.start || iso === draft.end),
            onclick: () => {
              // Duas etapas: escolher o início zera o fim; o segundo clique
              // fecha o intervalo. Clicar antes do início recomeça dali.
              if (!draft.start || draft.end) {
                draft = { start: iso, end: null }
              } else if (iso < draft.start) {
                draft = { start: iso, end: null }
              } else {
                draft = { start: draft.start, end: iso }
              }
              render()
            },
          }),
        )
      }

      menu.appendChild(header)
      menu.appendChild(grid)
      menu.appendChild(
        h(
          'button',
          {
            class: 'period-apply',
            type: 'button',
            text: T.period_apply,
            disabled: !draft.start || !draft.end,
            onclick: () => {
              if (!draft.start || !draft.end) return
              applyRange({ startDate: draft.start, endDate: draft.end })
            },
          },
        ),
      )
      return menu
    }

    function render() {
      const preset = activePreset()
      const label = preset
        ? PRESET_LABELS[preset]
        : `${shortDate(state.startDate)} – ${shortDate(state.endDate)}`

      container.replaceChildren(
        h('label', { class: 'period-row__label', text: T.period_label }),
        h('div', { class: 'period-select' }, [
          h(
            'button',
            {
              class: 'period-trigger',
              type: 'button',
              'aria-haspopup': 'listbox',
              'aria-expanded': String(open),
              onclick: event => {
                event.stopPropagation()
                open = !open
                if (open) {
                  draft = { start: state.startDate, end: state.endDate }
                  calendarMonth = data.startOfMonth(state.endDate)
                }
                render()
              },
            },
            [
              h('span', { class: 'period-trigger__value', text: label }),
              h('span', { html: ICONS.caretDown, 'aria-hidden': 'true' }),
            ],
          ),
          open ? renderMenu() : null,
        ]),
      )
    }

    container.addEventListener('click', event => event.stopPropagation())
    document.addEventListener('click', () => {
      if (!open) return
      close()
    })
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && open) close()
    })

    render()
    return { render, close }
  }

  // ─── Sparklines do funil ───────────────────────────────────────────────────
  // Abaixo de 3 meses o eixo é o dia; de 3 meses em diante, o mês (mesma regra
  // de `sparklineGrain` na tela real: até 89 dias, dia; acima, mês).
  function buildSparkTrends(report) {
    const isDaily = report.days <= 89
    const stageDefs = report.funnel.stages

    // No eixo mensal o traço usa os buckets mensais; no eixo diário, a série
    // diária — a mesma do gráfico "Evolução por dia", e ela fecha no total do
    // card.
    const axisDates = isDaily
      ? report.funnel.byDay.map(row => row.date)
      : report.funnel.byMonth.map(row => row.date)

    const valuesFor = key => {
      if (isDaily) return report.funnel.byDay.map(row => row[key] ?? 0)
      return report.funnel.byMonth.map(row => row[key] ?? 0)
    }

    // Teto compartilhado em raiz quadrada: o estágio maior define o topo e os
    // pequenos sobem sem sumir contra o chão — a escala é forma, não leitura.
    const sharedPeak = Math.max(1, ...stageDefs.flatMap(stage => valuesFor(stage.key)))

    const trends = {}
    stageDefs.forEach(stage => {
      const values = valuesFor(stage.key)
      trends[stage.id] = values.map((value, index) => ({
        date: axisDates[index],
        value,
        level: value === 0 ? 0 : Math.sqrt(value / sharedPeak) * 100,
      }))
    })

    // Visitantes na própria escala, nos mesmos buckets do funil. Dias sem
    // sessão no GA não vêm na série, mas o total do mês é o total: somar os
    // dias com visita é a leitura correta do bucket.
    const visitorBuckets = new Map()
    report.visitors.byDay.forEach(row => {
      const key = row.date.slice(0, 7)
      visitorBuckets.set(key, (visitorBuckets.get(key) ?? 0) + row.visitors)
    })

    const visitorValues = axisDates.map(axisDate => {
      if (isDaily) {
        return report.visitors.byDay.find(row => row.date === axisDate)?.visitors ?? 0
      }
      return visitorBuckets.get(axisDate.slice(0, 7)) ?? 0
    })

    const visitorPeak = Math.max(1, ...visitorValues)
    trends.visits = visitorValues.map((value, index) => ({
      date: axisDates[index],
      value,
      level: value === 0 ? 0 : Math.sqrt(value / visitorPeak) * 100,
    }))

    return trends
  }

  // ─── Bloco do funil ────────────────────────────────────────────────────────
  const STAGE_META = {
    leads: { label: T.stage_leads, help: T.stage_leads_help },
    qualified_leads: { label: T.stage_qualified, help: T.stage_qualified_help },
    opportunities: { label: T.stage_opportunities, help: T.stage_opportunities_help },
    sales: { label: T.stage_sales, help: T.stage_sales_help },
  }

  function variationPill(variationPct) {
    if (variationPct === null || variationPct === undefined) return null
    if (variationPct === 0) {
      return h('div', { class: 'pill pill--neutral' }, [
        h('span', { text: '0%' }),
        h('span', { class: 'pill__suffix', text: T.kpi_previous_period }),
      ])
    }
    const isGood = variationPct > 0
    const sign = variationPct > 0 ? '+' : '−'
    return h('div', { class: `pill ${isGood ? 'pill--good' : 'pill--bad'}` }, [
      h('span', { text: `${sign}${percent.format(Math.abs(variationPct))}%` }),
      h('span', { class: 'pill__suffix', text: T.kpi_previous_period }),
    ])
  }

  function kpiCard({ label, help, value, previousValue, variationPct, trend, status, message }) {
    const card = h('div', { class: 'card kpi-card' })

    card.appendChild(
      h('div', { class: 'block-title' }, [
        h('h3', { text: label }),
        help ? helpButton(help) : null,
      ]),
    )

    if (status === 'unavailable') {
      card.appendChild(h('p', { class: 'number-card__hint', text: message, style: 'margin-top:auto' }))
      return card
    }

    card.appendChild(h('p', { class: 'kpi-card__value', text: integer.format(value) }))

    if (variationPct !== null && variationPct !== undefined) {
      card.appendChild(variationPill(variationPct))
    }

    const spark = h('div', { class: 'kpi-card__spark', role: 'img' })
    spark.setAttribute(
      'aria-label',
      `${label}: ${integer.format(value)}. Tendência de ${trend.length} ${
        trend.length === 1 ? 'ponto' : 'pontos'
      }.`,
    )
    card.appendChild(spark)
    requestAnimationFrame(() => window.PocCharts.sparkline(spark, trend))

    return card
  }

  function renderFunnel(container, report, residentsVisitors) {
    const trends = buildSparkTrends(report)

    const cards = []

    // Visitantes: card próprio, com estado próprio (a integração é opcional).
    if (residentsVisitors.connected) {
      cards.push(
        kpiCard({
          label: T.stage_visits,
          help: T.stage_visits_help,
          value: report.visitors.total,
          previousValue: report.visitors.previousTotal,
          variationPct: report.visitors.variationPct,
          trend: trends.visits,
        }),
      )
    } else {
      cards.push(
        kpiCard({
          label: T.stage_visits,
          help: T.stage_visits_help,
          status: 'unavailable',
          message: T.visitors_not_connected,
        }),
      )
    }

    report.funnel.stages.forEach(stage => {
      cards.push(
        kpiCard({
          label: STAGE_META[stage.id].label,
          help: STAGE_META[stage.id].help,
          value: stage.value,
          previousValue: stage.previousValue,
          variationPct: stage.variationPct,
          trend: trends[stage.id],
        }),
      )
    })

    const source = report.period.previousStartDate
      ? T.source_comparison(
          fmtDate(report.period.startDate),
          fmtDate(report.period.endDate),
          fmtDate(report.period.previousStartDate),
          fmtDate(report.period.previousEndDate),
        )
      : T.source(fmtDate(report.period.startDate), fmtDate(report.period.endDate))

    container.replaceChildren(
      h('div', { class: 'kpis' }, [h('div', { class: 'kpis__grid', role: 'group' }, cards)]),
      h('p', { class: 'source-note', text: source }),
    )
  }

  // ─── Evolução por dia ──────────────────────────────────────────────────────
  const DAILY_SERIES = [
    { key: 'visitors', label: T.series_visitors, color: 'var(--warning-text)', defaultSelected: false, widensScale: true },
    { key: 'leads', label: T.series_leads, color: 'var(--neutral-icon-high-emphasis)', defaultSelected: true },
    { key: 'qualifiedLeads', label: T.series_qualified, color: 'var(--success-text)', defaultSelected: true },
    { key: 'opportunities', label: T.series_opportunities, color: 'var(--primary-text)', defaultSelected: true },
    { key: 'sales', label: T.series_sales, color: 'var(--highlight-text)', defaultSelected: true },
  ]

  function buildDailyPoints(report) {
    const visitorsByDate = new Map(report.visitors.byDay.map(row => [row.date, row.visitors]))
    return report.funnel.byDay.map(row => ({
      date: row.date,
      leads: row.leads,
      // A série diária da API usa o mesmo nome de estágio do funil mensal.
      qualifiedLeads: row.qualified_leads ?? row.qualified ?? 0,
      opportunities: row.opportunities,
      sales: row.sales,
      visitors: visitorsByDate.get(row.date) ?? 0,
    }))
  }

  function renderDaily(container, report, residentsVisitors, selected) {
    const points = buildDailyPoints(report)
    const totals = points.reduce(
      (acc, point) => ({
        visitors: acc.visitors + point.visitors,
        leads: acc.leads + point.leads,
        qualifiedLeads: acc.qualifiedLeads + point.qualifiedLeads,
        opportunities: acc.opportunities + point.opportunities,
        sales: acc.sales + point.sales,
      }),
      { visitors: 0, leads: 0, qualifiedLeads: 0, opportunities: 0, sales: 0 },
    )

    // O controle de visitantes só existe quando a série existe: um checkbox
    // que não muda o gráfico seria decorativo.
    const available = residentsVisitors.connected
      ? DAILY_SERIES
      : DAILY_SERIES.filter(item => item.key !== 'visitors')

    const visible = available.filter(item => selected.has(item.key))

    const toggles = h('div', {
      class: 'series-toggles',
      role: 'group',
      'aria-label': 'Séries para comparar',
    })

    available.forEach(item => {
      const pressed = selected.has(item.key)
      toggles.appendChild(
        h(
          'div',
          {
            class: 'series-toggle',
            'data-selected': String(pressed),
            style: `--series-color: ${item.color}`,
          },
          [
            h(
              'label',
              { class: 'series-toggle__label' },
              [
                h('input', {
                  type: 'checkbox',
                  checked: pressed ? 'checked' : null,
                  onchange: () => {
                    const next = new Set(selected)
                    if (next.has(item.key)) next.delete(item.key)
                    else next.add(item.key)
                    renderDaily(container, report, residentsVisitors, next)
                  },
                }),
                h('span', { class: 'checkbox', html: ICONS.check }),
                h('span', { class: 'series-toggle__copy' }, [
                  h('span', { class: 'series-toggle__name' }, [
                    h('span', { text: item.label }),
                  ]),
                  h('span', { class: 'series-toggle__count', text: integer.format(totals[item.key]) }),
                  h('span', {
                    class: 'series-toggle__swatch',
                    'aria-hidden': 'true',
                  }),
                ]),
              ],
            ),
          ],
        ),
      )
    })

    if (available.some(item => item.widensScale && selected.has(item.key))) {
      toggles.appendChild(h('p', { class: 'series-scale-note', text: T.daily_widens_scale }))
    }

    const chart = h('div', { class: 'chart' })
    requestAnimationFrame(() =>
      window.PocCharts.areaChart(chart, {
        points,
        series: visible,
        height: 280,
        emptyText: T.daily_none,
        ariaLabel: T.daily_period(fmtDate(report.period.startDate), fmtDate(report.period.endDate)),
      }),
    )

    container.replaceChildren(
      h('div', { class: 'block-head' }, [
        blockTitle(T.daily_title, T.daily_help),
        h('p', {
          class: 'block-period',
          text: T.daily_period(fmtDate(report.period.startDate), fmtDate(report.period.endDate)),
        }),
      ]),
      h('div', { class: 'card card--lg' }, [toggles, chart]),
    )

    const chartNode = container.querySelector('.chart')
    if (chartNode && !chartNode.dataset.observed) {
      chartNode.dataset.observed = 'true'
      window.PocCharts.observeResize(chartNode, () => {
        window.PocCharts.areaChart(chartNode, {
          points,
          series: visible,
          height: 280,
          emptyText: T.daily_none,
          ariaLabel: T.daily_period(fmtDate(report.period.startDate), fmtDate(report.period.endDate)),
        })
      })
    }
  }

  // ─── Faixa esperada ────────────────────────────────────────────────────────
  const BAND_RATE_LABELS = {
    qualification: T.band_rate_qualification,
    opportunity: T.band_rate_opportunity,
    win: T.band_rate_win,
  }

  const BAND_LABELS = {
    dentro: T.band_dentro,
    acima: T.band_acima,
    abaixo: T.band_abaixo,
    insuficiente: T.band_insuficiente,
  }

  const BAND_POINT_COLOR = {
    acima: 'var(--success-icon)',
    dentro: 'var(--primary-icon)',
    abaixo: 'var(--danger-icon)',
    insuficiente: 'var(--neutral-icon-low-emphasis)',
  }

  const pct1 = value =>
    value === null || value === undefined
      ? '—'
      : `${new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(value * 100)}%`

  function bandCard(rateItem) {
    const domainMax = Math.max(rateItem.high ?? 0, rateItem.observed ?? 0) * 1.15 || 1
    const at = value => Math.min(100, Math.max(0, (value / domainMax) * 100))

    const track =
      rateItem.low !== null && rateItem.high !== null
        ? h('div', { class: 'band-track', 'aria-hidden': 'true' }, [
            h('div', { class: 'band-track__rail' }),
            h('div', {
              class: 'band-track__range',
              style: `left:${at(rateItem.low)}%;width:${Math.max(0, at(rateItem.high) - at(rateItem.low))}%`,
            }),
            h('div', {
              class: 'band-track__point',
              style: `left:${at(rateItem.observed)}%;background:${BAND_POINT_COLOR[rateItem.band]}`,
            }),
          ])
        : null

    return h('div', { class: 'card band-card' }, [
      h('p', { class: 'band-card__title', text: BAND_RATE_LABELS[rateItem.id] }),
      h('div', { class: 'band-card__head' }, [
        h('p', { class: 'band-card__value', text: pct1(rateItem.observed) }),
        h('span', {
          class: `pill band-pill--${rateItem.band}`,
          text: BAND_LABELS[rateItem.band],
        }),
      ]),
      track,
      h('div', { class: 'band-card__note' }, [
        h('p', {
          text:
            rateItem.band === 'insuficiente'
              ? T.band_note_insufficient(rateItem.trials)
              : T.band_note(pct1(rateItem.low), pct1(rateItem.high)),
        }),
        rateItem.band !== 'insuficiente' ? helpButton(T.band_note_help) : null,
      ]),
    ])
  }

  function renderBands(container, report) {
    const head = h('div', { class: 'block-head' }, [
      blockTitle(T.bands_title),
      h('p', { class: 'block-period', text: T.bands_subtitle }),
    ])

    if (!report.bandsAllowed) {
      container.replaceChildren(
        head,
        h('div', { class: 'card' }, [
          h('p', { class: 'number-card__hint', text: T.bands_limit }),
        ]),
      )
      return
    }

    container.replaceChildren(
      head,
      h('div', { class: 'kpis' }, [
        h(
          'div',
          { class: 'kpis__grid', role: 'group', 'aria-label': T.bands_title },
          report.bands.map(bandCard),
        ),
      ]),
    )
  }

  // ─── Conversões ────────────────────────────────────────────────────────────
  const CONV_SERIES = [
    { key: 'conversions', label: T.conv_series_leads, color: 'var(--neutral-icon-high-emphasis)' },
    { key: 'opportunities', label: T.conv_series_opportunities, color: 'var(--primary-text)' },
    { key: 'customers', label: T.conv_series_customers, color: 'var(--highlight-text)' },
  ]

  function renderConversions(kpisContainer, chartContainer, report, selected) {
    const period = report.period
    const periodLine = () =>
      h('p', {
        class: 'block-period',
        text: T.daily_period(fmtDate(period.startDate), fmtDate(period.endDate)),
      })

    const numberCard = (title, hint, value) =>
      h('div', { class: 'block' }, [
        h('div', {}, [blockTitle(title, hint), periodLine()]),
        h('div', { class: 'card card--text' }, [
          h('p', { class: 'number-card__hint', text: hint }),
          h('p', { class: 'number-card__value', text: integer.format(value) }),
        ]),
      ])

    const visible = CONV_SERIES.filter(item => selected.has(item.key))
    const totals = report.conversions.byDay.reduce(
      (acc, row) => ({
        conversions: acc.conversions + row.conversions,
        opportunities: acc.opportunities + row.opportunities,
        customers: acc.customers + row.customers,
      }),
      { conversions: 0, opportunities: 0, customers: 0 },
    )

    const toggles = h('div', {
      class: 'series-toggles',
      role: 'group',
      'aria-label': 'Séries para comparar',
    })
    CONV_SERIES.forEach(item => {
      const pressed = selected.has(item.key)
      toggles.appendChild(
        h(
          'div',
          {
            class: 'series-toggle',
            'data-selected': String(pressed),
            style: `--series-color: ${item.color}`,
          },
          [
            h('label', { class: 'series-toggle__label' }, [
              h('input', {
                type: 'checkbox',
                checked: pressed ? 'checked' : null,
                onchange: () => {
                  const next = new Set(selected)
                  if (next.has(item.key)) next.delete(item.key)
                  else next.add(item.key)
                  renderConversions(kpisContainer, chartContainer, report, next)
                },
              }),
              h('span', { class: 'checkbox', html: ICONS.check }),
              h('span', { class: 'series-toggle__copy' }, [
                h('span', { class: 'series-toggle__name' }, [h('span', { text: item.label })]),
                h('span', { class: 'series-toggle__count', text: integer.format(totals[item.key]) }),
                h('span', { class: 'series-toggle__swatch', 'aria-hidden': 'true' }),
              ]),
            ]),
          ],
        ),
      )
    })

    const chart = h('div', { class: 'chart' })
    requestAnimationFrame(() =>
      window.PocCharts.areaChart(chart, {
        points: report.conversions.byDay,
        series: visible,
        height: 280,
        emptyText: T.daily_none,
        ariaLabel: T.conv_over_time_aria(fmtDate(period.startDate), fmtDate(period.endDate)),
      }),
    )

    kpisContainer.replaceChildren(
      h('div', { class: 'conversions-kpis' }, [
        h('div', { class: 'conversions-kpis__grid' }, [
          numberCard(T.conv_qualified_title, T.conv_qualified_hint, report.conversions.qualifiedLeads.value),
          numberCard(T.conv_opportunities_title, T.conv_opportunities_hint, report.conversions.opportunities.value),
        ]),
      ]),
    )

    chartContainer.replaceChildren(
      h('div', {}, [
        blockTitle(T.conv_over_time_title, T.conv_over_time_hint),
        periodLine(),
        h('p', { class: 'block-period', text: T.conv_over_time_hint, style: 'margin-top:4px' }),
      ]),
      h('div', { class: 'card card--lg' }, [toggles, chart]),
    )

    const chartNode = chartContainer.querySelector('.chart')
    if (chartNode) {
      window.PocCharts.observeResize(chartNode, () => {
        window.PocCharts.areaChart(chartNode, {
          points: report.conversions.byDay,
          series: visible,
          height: 280,
          emptyText: T.daily_none,
          ariaLabel: T.conv_over_time_aria(fmtDate(period.startDate), fmtDate(period.endDate)),
        })
      })
    }
  }

  // ─── Email ─────────────────────────────────────────────────────────────────
  const EMAIL_METRIC_ORDER = [
    'campaign_count',
    'sent',
    'delivered',
    'unique_opens',
    'open_rate',
    'unique_clicks',
    'click_rate',
    'unique_bounces',
  ]

  const EMAIL_TABS = [
    { id: 'sends', label: T.email_tab_sends, title: T.email_sends_title },
    { id: 'recent', label: T.email_tab_recent, title: T.email_recent_title },
    { id: 'clicks', label: T.email_tab_clicks, title: T.email_clicks_title },
  ]

  const tablePercent = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  function metricValue(metric) {
    if (metric.value === null || metric.value === undefined) return { text: '—', empty: true }
    return {
      text: metric.isPercent ? `${tablePercent.format(metric.value)}%` : integer.format(metric.value),
      empty: false,
    }
  }

  function emailTable(rows, tabId) {
    const headers = [
      T.email_col_campaign,
      T.email_col_type,
      T.email_col_sent_at,
      T.email_col_sent,
      T.email_col_delivered,
      T.email_col_opened,
      T.email_col_open_rate,
      T.email_col_clicked,
      T.email_col_click_rate,
    ]

    const head = h('thead', {}, [
      h(
        'tr',
        {},
        headers.map(header => h('th', { scope: 'col', text: header })),
      ),
    ])

    const body = h(
      'tbody',
      {},
      rows.map(row =>
        h('tr', {}, [
          h('td', { text: row.name ?? '—' }),
          h('td', {}, [
            h('span', {
              class: `tag ${row.type === 'workflow' ? 'tag--primary' : ''}`,
              text: row.type === 'workflow' ? T.email_type_workflow : T.email_type_campaign,
            }),
          ]),
          h('td', { class: 'muted', text: row.sentAt ? fmtDate(row.sentAt) : '—' }),
          h('td', { class: 'num', text: integer.format(row.sent ?? 0) }),
          h('td', { class: 'num', text: integer.format(row.delivered ?? 0) }),
          h('td', { class: 'num', text: integer.format(row.opened ?? 0) }),
          h('td', {
            class: 'num muted',
            text: row.openRate === null || row.openRate === undefined ? '—' : `${tablePercent.format(row.openRate)}%`,
          }),
          h('td', { class: 'num', text: integer.format(row.clicked ?? 0) }),
          h('td', {
            class: 'num muted',
            text: row.clickRate === null || row.clickRate === undefined ? '—' : `${tablePercent.format(row.clickRate)}%`,
          }),
        ]),
      ),
    )

    return h('div', { class: 'table-scroll' }, [
      h('table', { class: 'campaigns' }, [
        h('caption', { text: T.email_caption }),
        head,
        body,
      ]),
    ])
  }

  function renderEmail(container, report, activeTab) {
    const email = report.email

    const header = h('div', { class: 'block-head' }, [
      blockTitle(T.email_title, T.email_help),
      h('p', {
        class: 'block-period',
        text: email.period
          ? T.email_report_period(fmtDate(email.period.startDate), fmtDate(email.period.endDate))
          : '',
      }),
    ])

    if (email.isEmpty) {
      container.replaceChildren(
        header,
        h('div', { class: 'card empty-card' }, [
          h('h4', { text: 'Sem campanhas de email no período' }),
          h('p', { text: 'Não há envios registrados nesta conta para o intervalo selecionado.' }),
        ]),
      )
      return
    }

    const cards = EMAIL_METRIC_ORDER.map(id => {
      const metric = email.metrics.find(item => item.id === id)
      if (!metric) return null
      const value = metricValue(metric)
      return h('div', { class: 'card email-card' }, [
        h('div', { class: 'email-card__title' }, [
          h('h4', { text: T[`email_metric_${id}`] }),
          helpButton(T[`email_metric_${id}_help`]),
        ]),
        h('p', {
          class: `email-card__value${value.empty ? ' email-card__value--empty' : ''}`,
          text: value.text,
        }),
      ])
    })

    // Abas: só as que existem (a de "últimas" some quando não há data de envio).
    const availableTabs = EMAIL_TABS.filter(tab => email.tables[tab.id])
    const current = availableTabs.find(tab => tab.id === activeTab) || availableTabs[0]

    const tablist = h(
      'div',
      { class: 'tablist', role: 'tablist' },
      availableTabs.map(tab =>
        h('button', {
          class: 'tab',
          type: 'button',
          role: 'tab',
          'aria-selected': String(tab.id === current.id),
          text: tab.label,
          onclick: () => renderEmail(container, report, tab.id),
        }),
      ),
    )

    const rows = email.tables[current.id].rows ?? []

    container.replaceChildren(
      header,
      h('div', { class: 'kpis' }, [h('div', { class: 'email-kpis__grid' }, cards)]),
      h('p', { class: 'scope-note', text: T.email_scope_note }),
      h('div', { class: 'campaign-tabs' }, [
        tablist,
        h('div', { class: 'tab-content', role: 'tabpanel' }, [
          h('h4', { text: current.title }),
          rows.length
            ? emailTable(rows, current.id)
            : h('p', {
                class: 'campaigns-empty',
                text: current.id === 'recent' ? T.email_empty_recent : T.email_empty_generic,
              }),
        ]),
      ]),
    )
  }

  // ─── Estado da página ──────────────────────────────────────────────────────
  const state = {
    range: data.defaultRange(),
    visitorsConnected: true,
    dailySelected: new Set(DAILY_SERIES.filter(item => item.defaultSelected).map(item => item.key)),
    convSelected: new Set(CONV_SERIES.map(item => item.key)),
    emailTab: 'sends',
  }

  const nodes = {
    periodRow: document.getElementById('period-row'),
    funnel: document.getElementById('block-funnel'),
    daily: document.getElementById('block-daily'),
    bands: document.getElementById('block-bands'),
    convKpis: document.getElementById('block-conv-kpis'),
    convTime: document.getElementById('block-conv-time'),
    email: document.getElementById('block-email'),
    scenario: document.getElementById('poc-scenario'),
    scenarioToggle: document.getElementById('poc-scenario-toggle'),
  }

  let currentReport = null

  function renderAll() {
    const report = data.load(state.range.startDate, state.range.endDate)
    currentReport = report

    const residentsVisitors = state.visitorsConnected
      ? report.visitors
      : { connected: false }

    renderFunnel(nodes.funnel, report, residentsVisitors)
    renderDaily(nodes.daily, report, residentsVisitors, state.dailySelected)
    renderBands(nodes.bands, report)
    renderConversions(nodes.convKpis, nodes.convTime, report, state.convSelected)
    renderEmail(nodes.email, report, state.emailTab)

    nodes.scenario.textContent = state.visitorsConnected
      ? 'Google Analytics conectado.'
      : 'Simulando conta sem Google Analytics.'
  }

  createPeriodPicker(nodes.periodRow, state.range, range => {
    // Muta o MESMO objeto que o seletor guardou: substituir `state.range` por
    // outro objeto deixaria o picker com a referência antiga e o trigger
    // continuaria mostrando o período anterior.
    state.range.startDate = range.startDate
    state.range.endDate = range.endDate
    renderAll()
  })

  nodes.scenarioToggle.addEventListener('click', () => {
    state.visitorsConnected = !state.visitorsConnected
    nodes.scenarioToggle.textContent = state.visitorsConnected
      ? 'Simular conta sem Google Analytics'
      : 'Simular conta com Google Analytics'
    renderAll()
  })

  renderAll()

  // Os gráficos são medidos no layout; um resize da janela redesenha tudo que
  // depende de largura (o sparkline é medido no primeiro frame).
  let resizeFrame = null
  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null
      if (currentReport) renderAll()
    })
  })
})()
