// Página estática do Centralizador — toda a interação em JS puro.
//
// Reproduz os dois relatórios de captação do MFE (`analysis-centralizer`) com
// os mesmos textos, ordem dos blocos e regras de apresentação:
//
//   - "Como está a captação": cards de KPI (que também ligam/desligam as séries
//     do gráfico), um gráfico único com três leituras (por dia, acumulado e
//     taxas), sobreposição do período anterior e projeção do mês corrente;
//   - "Como foram os e-mails": cards de evento, ressalva de escopo e três abas
//     de tabela.
//
// O menu de relatórios é o mesmo da tela real: Captação tem os dois relatórios
// e a seção Vendas está desligada (não aparece e nenhum link abre uma tela de
// vendas).
//
// Nenhuma chamada de rede: os dados vêm de `data.js` (sintéticos).
(function () {
  'use strict'

  const data = window.PocData
  const { integer, date } = window.PocCharts.formats

  // ─── Textos (os do locale pt-BR do MFE) ────────────────────────────────────
  const T = {
    report_captacao_title: 'Como está a captação',
    report_emails_title: 'Como foram os e-mails',
    nav_reports: 'Relatórios',
    nav_group_captacao: 'Captação',

    marketing_kpi_previous_period: 'no período anterior',
    marketing_kpi_previous_amount: value => `Antes: ${value}`,
    marketing_kpi_no_variation: 'Sem variação',
    marketing_kpi_series_toggle: name => `Mostrar ou ocultar ${name} no gráfico`,

    funnel_stage_visits: 'Visitantes',
    funnel_stage_visits_help: 'Pessoas que visitaram o site no período, pelo Google Analytics.',
    funnel_stage_leads: 'Leads',
    funnel_stage_leads_help: 'Total de novos contatos gerados no período selecionado.',
    funnel_stage_qualified_leads: 'Qualificados',
    funnel_stage_qualified_leads_help:
      'Contatos que tiveram seu estágio alterado para lead qualificado no período selecionado.',
    funnel_stage_opportunities: 'Oportunidades',
    funnel_stage_opportunities_help:
      'Contatos marcados como oportunidade no Marketing no período selecionado.',
    funnel_stage_sales: 'Vendas',
    funnel_stage_sales_help: 'Contatos com vendas registradas no Marketing no período selecionado.',
    visitors_not_connected:
      'Esta conta não tem uma integração com o Google Analytics conectada, então não há dados de visitantes para exibir.',

    funnel_rate_of_visits: 'dos visitantes',
    funnel_rate_of_leads: 'dos leads',
    funnel_rate_of_qualified: 'dos qualificados',
    funnel_rate_of_opportunities: 'das oportunidades',

    performance_title: 'Desempenho no período',
    performance_view_label: 'Leitura do gráfico',
    performance_view_daily: 'Por dia',
    performance_view_cumulative: 'Acumulado',
    performance_view_rates: 'Taxas',
    performance_compare_toggle: 'Comparar com período anterior',
    performance_compare_help:
      'Tracejado: período anterior. No mês corrente, o mês anterior fechado, projetado até o fim.',
    performance_chart_aria: (start, end) => `Desempenho de ${start} a ${end}.`,
    daily_series_none_selected: 'Selecione ao menos uma série para comparar.',
    real_funnel_source: (start, end) => `Período de ${start} a ${end}.`,
    real_funnel_source_with_comparison: (start, end, previousStart, previousEnd) =>
      `Período de ${start} a ${end}, comparado a ${previousStart} a ${previousEnd}.`,

    conversion_bands_subtitle:
      'Cada taxa divide a etapa pela anterior. A faixa é o ritmo da conta, não uma meta.',
    conversion_bands_period_limit: 'Selecione um período de até 3 meses.',
    conversion_rate_qualification: 'Taxa de qualificação',
    conversion_rate_qualification_help: 'Qualificados divididos pelos leads do período.',
    conversion_rate_opportunity: 'Taxa de oportunidade',
    conversion_rate_opportunity_help: 'Oportunidades divididas pelos qualificados do período.',
    conversion_rate_win: 'Taxa de conversão em venda',
    conversion_rate_win_help: 'Vendas divididas pelas oportunidades do período.',
    conversion_band_dentro: 'No ritmo recente',
    conversion_band_acima: 'Acima do ritmo recente',
    conversion_band_abaixo: 'Abaixo do ritmo recente',
    conversion_band_insuficiente: 'Evidência insuficiente',
    conversion_band_note: (low, high) => `Ritmo recente de ${low} a ${high}.`,
    conversion_band_note_help:
      'Média da conta nos 3 períodos anteriores de mesma duração. Faixa de 95% em torno dessa média. Não é meta.',
    conversion_band_note_insufficient: trials =>
      `Amostra pequena para classificar (${integer.format(trials)} no denominador). Não é erro — é cedo para dizer se está dentro ou fora do normal.`,

    conv_period: (start, end) => `Período de ${start} a ${end}.`,
    conv_qualified_title: 'Conversões de leads qualificados',
    conv_qualified_hint: 'Contatos que entraram em lead qualificado. Difere do card Qualificados do funil.',
    conv_opportunities_title: 'Conversões de oportunidades',
    conv_opportunities_hint: 'Eventos em que um contato virou oportunidade. Difere do card de estágio do funil.',
    conv_over_time_title: 'Conversões durante o tempo',
    conv_over_time_hint: 'Por dia: eventos de conversão, de oportunidade e clientes. Não lista a conversão.',
    conv_over_time_aria: (start, end) =>
      `Conversões por dia de ${start} a ${end}: leads, oportunidades e clientes.`,
    conv_series_leads: 'Conversões dos leads',
    conv_series_opportunities: 'Eventos de oportunidade',
    conv_series_customers: 'Clientes',
    daily_projection_toggle: 'Ver projeção',
    daily_projection_help:
      'Ritmo médio diário até o fim do mês; hoje zerado fica fora. Estimativa, não medição.',
    daily_projection_tooltip_value: value => `≈ ${value} por dia`,
    daily_series_toggle_group: 'Séries para comparar',

    email_report_title: 'Campanhas e automações de email',
    email_report_help:
      'Desempenho dos e-mails disparados tanto em campanhas pontuais quanto em fluxos de automação.',
    email_report_period: (start, end) => `Período de ${start} a ${end}.`,
    email_report_scope_note:
      'Dados consolidados das campanhas e automações do período selecionado. As taxas consideram eventos de e-mail e não contatos únicos, o que pode fazer os valores passarem de 100%.',
    email_metric_campaign_count: 'Campanhas e automações',
    email_metric_campaign_count_help:
      'Quantidade de campanhas e automações com envio no período. Não é o total de disparos.',
    email_metric_sent: 'Total de envios',
    email_metric_sent_help:
      'Total de disparos individuais de e-mails em campanhas e automações no período selecionado.',
    email_metric_delivered: 'Total de entregas',
    email_metric_delivered_help:
      'Total de e-mails que chegaram com sucesso ao destinatário no período selecionado.',
    email_metric_unique_opens: 'Aberturas',
    email_metric_unique_opens_help: 'Total de aberturas de e-mails registradas no período selecionado.',
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
    email_recent_caption: 'Campanhas de email do período',

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
  }

  // ─── Formatação ────────────────────────────────────────────────────────────
  const percent2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
  const percent1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
  const percentFixed2 = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const fmtDate = iso => date(iso)
  const pct2 = value => `${percent2.format(value * 100)}%`
  const pct1 = value => `${percent1.format(value * 100)}%`

  function signedPercent(value) {
    if (value === 0) return '0%'
    const sign = value > 0 ? '+' : '−'
    return `${sign}${percent2.format(Math.abs(value))}%`
  }

  function localTodayIso() {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
  }

  // ─── Helpers de DOM ────────────────────────────────────────────────────────
  function appendChildren(node, children) {
    ;(children || []).forEach(child => {
      if (child === null || child === undefined || child === false) return
      if (Array.isArray(child)) {
        appendChildren(node, child)
        return
      }
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
  }

  function h(tag, attrs, children) {
    const node = document.createElement(tag)
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return
        if (key === 'class') node.className = value
        else if (key === 'html') node.innerHTML = value
        else if (key === 'text') node.textContent = value
        else if (key === 'style') node.setAttribute('style', value)
        else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value)
        else node.setAttribute(key, value === true ? '' : value)
      })
    }
    appendChildren(node, children)
    return node
  }

  function helpButton(text) {
    return h('span', { class: 'af-metric-help-wrap' }, [
      h('button', {
        class: 'af-metric-help',
        type: 'button',
        'aria-label': text,
        html: ICONS.question,
      }),
      h('div', { class: 'tooltip', role: 'tooltip', html: `<span>${text}</span>` }),
    ])
  }

  function metricTitle(title, help, level) {
    return h('div', { class: 'af-metric-title' }, [
      h(level || 'h3', { text: title }),
      help ? helpButton(help) : null,
    ])
  }

  function checkControl({ checked, onChange, label, ariaLabel, className }) {
    const input = h('input', {
      class: 'check-input',
      type: 'checkbox',
      checked: checked ? 'checked' : null,
      'aria-label': ariaLabel || null,
      onchange: onChange,
      onclick: event => event.stopPropagation(),
    })
    return h('label', { class: `check-control${className ? ` ${className}` : ''}` }, [
      input,
      h('span', { class: 'checkbox', html: ICONS.check }),
      label ? h('span', { class: 'check-control__label', text: label }) : null,
    ])
  }

  // ─── Seleção de período ────────────────────────────────────────────────────
  // Nível 1 = atalhos; nível 2 = calendário + Aplicar. Presets aplicam no
  // clique; o período personalizado só no "Aplicar" (um intervalo é escolhido
  // em duas etapas).
  function createPeriodPicker(container, state, onChange) {
    const now = new Date()
    const todayIso = data.toISO(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)))

    let open = false
    let level = 'root'
    let calendarMonth = data.startOfMonth(state.range.endDate)
    let draft = { start: state.range.startDate, end: state.range.endDate }

    const activePreset = () => {
      for (const group of data.PRESET_GROUPS) {
        for (const id of group) {
          const preset = data.presetRange(id, todayIso)
          if (preset.startDate === state.range.startDate && preset.endDate === state.range.endDate) return id
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
              'aria-selected': String(activePreset() === id),
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
              'aria-selected': String(activePreset() === id),
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
              class: 'period-option period-option--nav',
              type: 'button',
              role: 'option',
              'aria-selected': 'false',
              onclick: () => {
                level = 'custom'
                draft = { start: state.range.startDate, end: state.range.endDate }
                calendarMonth = data.startOfMonth(state.range.endDate)
                render()
              },
            },
            [
              h('span', { text: T.period_custom }),
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
        h('button', {
          class: 'period-apply',
          type: 'button',
          text: T.period_apply,
          disabled: !draft.start || !draft.end,
          onclick: () => {
            if (!draft.start || !draft.end) return
            applyRange({ startDate: draft.start, endDate: draft.end })
          },
        }),
      )
      return menu
    }

    function render() {
      const preset = activePreset()
      const label = preset
        ? PRESET_LABELS[preset]
        : `${shortDate(state.range.startDate)} – ${shortDate(state.range.endDate)}`

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
                  draft = { start: state.range.startDate, end: state.range.endDate }
                  calendarMonth = data.startOfMonth(state.range.endDate)
                }
                render()
              },
            },
            [
              h('span', { class: 'period-trigger__value', text: label }),
              h('span', { class: 'period-trigger__icon', html: ICONS.caretDown, 'aria-hidden': 'true' }),
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
    return { render }
  }

  // ─── Séries do bloco de desempenho ─────────────────────────────────────────
  const SERIES = [
    {
      id: 'visits',
      dataKey: 'visitors',
      labelKey: 'funnel_stage_visits',
      helpKey: 'funnel_stage_visits_help',
      color: 'var(--warning-text)',
      // Eixo próprio: visitante é outra ordem de grandeza e achataria as etapas.
      axis: 'right',
    },
    {
      id: 'leads',
      dataKey: 'leads',
      labelKey: 'funnel_stage_leads',
      helpKey: 'funnel_stage_leads_help',
      color: 'var(--neutral-icon-high-emphasis)',
    },
    {
      id: 'qualified_leads',
      dataKey: 'qualified_leads',
      labelKey: 'funnel_stage_qualified_leads',
      helpKey: 'funnel_stage_qualified_leads_help',
      color: 'var(--success-text)',
    },
    {
      id: 'opportunities',
      dataKey: 'opportunities',
      labelKey: 'funnel_stage_opportunities',
      helpKey: 'funnel_stage_opportunities_help',
      color: 'var(--primary-text)',
    },
    {
      id: 'sales',
      dataKey: 'sales',
      labelKey: 'funnel_stage_sales',
      helpKey: 'funnel_stage_sales_help',
      color: 'var(--highlight-text)',
    },
  ]

  const CONV_SERIES = [
    { dataKey: 'conversions', labelKey: 'conv_series_leads', color: 'var(--neutral-icon-high-emphasis)' },
    { dataKey: 'opportunities', labelKey: 'conv_series_opportunities', color: 'var(--primary-text)' },
    { dataKey: 'customers', labelKey: 'conv_series_customers', color: 'var(--highlight-text)' },
  ]

  // Taxas da visão "Taxas": mesma ordem do funil e mesmas cores dos estágios.
  const RATE_DEFS = [
    {
      key: 'qualification',
      labelKey: 'conversion_rate_qualification',
      helpKey: 'conversion_rate_qualification_help',
      color: 'var(--success-text)',
    },
    {
      key: 'opportunity',
      labelKey: 'conversion_rate_opportunity',
      helpKey: 'conversion_rate_opportunity_help',
      color: 'var(--primary-text)',
    },
    {
      key: 'win',
      labelKey: 'conversion_rate_win',
      helpKey: 'conversion_rate_win_help',
      color: 'var(--highlight-text)',
    },
  ]

  const BAND_LABEL_KEY = {
    dentro: 'conversion_band_dentro',
    acima: 'conversion_band_acima',
    abaixo: 'conversion_band_abaixo',
    insuficiente: 'conversion_band_insuficiente',
  }

  const BAND_PILL = {
    acima: {
      background: 'var(--success-surface-low-emphasis)',
      color: 'var(--success-text)',
    },
    dentro: {
      background: 'var(--primary-surface-low-emphasis)',
      color: 'var(--primary-text)',
    },
    abaixo: {
      background: 'var(--danger-surface-low-emphasis)',
      color: 'var(--danger-text)',
    },
    insuficiente: {
      background: 'var(--neutral-surface-low-emphasis)',
      color: 'var(--neutral-text-low-emphasis)',
    },
  }

  const BAND_MARK = {
    acima: 'var(--success-icon)',
    dentro: 'var(--primary-icon)',
    abaixo: 'var(--danger-icon)',
    insuficiente: 'var(--neutral-icon-low-emphasis)',
  }

  // ─── Pontos diários e transformações de série ──────────────────────────────
  function dailyPoints(report) {
    const visitorsByDate = new Map((report.visitors.byDay ?? []).map(row => [row.date, row.visitors]))
    return report.byDay.map(row => ({
      date: row.date,
      visitors: visitorsByDate.get(row.date) ?? 0,
      leads: row.leads,
      qualified_leads: row.qualified_leads,
      opportunities: row.opportunities,
      sales: row.sales,
    }))
  }

  function visibleSeries(report) {
    return SERIES.filter(
      item => (item.id !== 'visits' || report.visitors.connected) && state.selected.has(item.id),
    )
  }

  function toCumulative(points, keys) {
    const running = {}
    keys.forEach(key => {
      running[key] = 0
    })
    return points.map(point => {
      const row = { ...point }
      keys.forEach(key => {
        running[key] += point[key] ?? 0
        row[key] = running[key]
      })
      return row
    })
  }

  // Projeção linear até o fim do mês, só com os pontos diários já carregados.
  const DAY_MS = 86400000
  const isoToDate = iso => new Date(`${iso}T12:00:00Z`)
  const dateToIso = value => value.toISOString().slice(0, 10)

  function monthEndIso(iso) {
    const value = isoToDate(iso)
    return dateToIso(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0, 12)))
  }

  function nextIso(iso) {
    const value = isoToDate(iso)
    value.setUTCDate(value.getUTCDate() + 1)
    return dateToIso(value)
  }

  function isDailySeries(points) {
    if (points.length < 2) return true
    return nextIso(points[points.length - 2].date) === points[points.length - 1].date
  }

  function canProjectMonth(points, today) {
    if (!points?.length || !isDailySeries(points)) return false
    const last = points[points.length - 1].date
    if (!last || last < today || last.slice(0, 7) !== today.slice(0, 7)) return false
    return last < monthEndIso(today)
  }

  function withMonthProjection(points, keys, today) {
    if (!canProjectMonth(points, today) || !keys.length) return { points, active: false }

    const last = points[points.length - 1]
    const pointIsZero = keys.every(key => !last[key])
    const sample = last.date === today && pointIsZero ? points.slice(0, -1) : points
    const base = sample.length ? sample : points
    const means = {}
    keys.forEach(key => {
      const total = base.reduce((sum, point) => sum + (point[key] ?? 0), 0)
      means[key] = Math.round(total / base.length)
    })

    const bridgeAt = sample.length ? sample.length - 1 : points.length - 1
    const stamped = points.map((point, index) => {
      const row = { ...point }
      keys.forEach(key => {
        row[`${key}Forecast`] = index === bridgeAt ? means[key] : null
      })
      return row
    })

    const extra = []
    let cursor = nextIso(last.date)
    const end = monthEndIso(today)
    while (cursor <= end) {
      const row = { date: cursor, projected: true }
      keys.forEach(key => {
        row[key] = null
        row[`${key}Forecast`] = means[key]
      })
      extra.push(row)
      cursor = nextIso(cursor)
    }

    return { points: [...stamped, ...extra], active: extra.length > 0, means }
  }

  // Separa o medido da projeção para as duas coisas não irem no mesmo traço.
  // O último dia medido entra nos dois, para o tracejado encostar na linha.
  function splitProjection(points, keys) {
    let lastMeasured = -1
    points.forEach((point, index) => {
      if (!point.projected) lastMeasured = index
    })

    const current = []
    const forecast = []
    points.forEach((point, index) => {
      const measured = { date: point.date }
      const projected = { date: point.date }
      keys.forEach(key => {
        measured[key] = point.projected ? null : point[key] ?? null
        // Nos dias projetados o valor medido é null; o número do tracejado vem
        // de `keyForecast` (a média diária). No último dia medido os dois
        // conjuntos têm valor, para o tracejado encostar na linha sólida.
        if (point.projected) {
          projected[key] = point[`${key}Forecast`] ?? null
        } else {
          projected[key] = index === lastMeasured ? point[key] ?? null : null
        }
      })
      current.push(measured)
      forecast.push(projected)
    })
    return { current, forecast }
  }

  // Acumulado com projeção: a soma corrida acontece sobre a série inteira
  // (medida + prevista) e só depois é partida nos dois traços.
  function cumulativeProjection(points, keys) {
    const running = {}
    keys.forEach(key => {
      running[key] = 0
    })
    let lastMeasured = -1
    points.forEach((point, index) => {
      if (!point.projected) lastMeasured = index
    })

    const current = []
    const forecast = []
    points.forEach((point, index) => {
      const currentRow = { date: point.date }
      const forecastRow = { date: point.date }
      keys.forEach(key => {
        const value = point.projected ? point[`${key}Forecast`] ?? 0 : point[key] ?? 0
        running[key] += value
        currentRow[key] = point.projected ? null : running[key]
        forecastRow[key] = point.projected || index === lastMeasured ? running[key] : null
      })
      current.push(currentRow)
      forecast.push(forecastRow)
    })
    return { current, forecast }
  }

  // Sobrepõe a série anterior à atual, alinhando por POSIÇÃO no período.
  function alignComparison(points, previousPoints, keys, forecastPoints) {
    const current = points ?? []
    const previous = previousPoints ?? []
    const forecast = forecastPoints ?? []
    const length = Math.max(current.length, previous.length, forecast.length)

    return Array.from({ length }, (_, index) => {
      const row = { date: `D${index + 1}`, index }
      keys.forEach(key => {
        row[key] = current[index]?.[key] ?? null
        row[`${key}Previous`] = previous[index]?.[key] ?? null
        if (forecastPoints) row[`${key}Forecast`] = forecast[index]?.[key] ?? null
      })
      return row
    })
  }

  function performanceRows(report, comparison) {
    const visible = visibleSeries(report)
    const keys = visible.map(item => item.dataKey)
    const today = localTodayIso()
    let current = dailyPoints(report)
    let forecast = []
    let projectionActive = false

    if (state.comparing && data.isMonthToDate(report.period) && keys.length) {
      const projection = withMonthProjection(current, keys, today)
      projectionActive = projection.active
      if (projection.active) {
        if (state.view === 'cumulative') {
          const cumulative = cumulativeProjection(projection.points, keys)
          current = cumulative.current
          forecast = cumulative.forecast
        } else {
          const split = splitProjection(projection.points, keys)
          current = split.current
          forecast = split.forecast
        }
      }
    } else if (state.view === 'cumulative') {
      current = toCumulative(current, keys)
    }

    let previous = comparison ? dailyPoints(comparison) : []
    if (state.view === 'cumulative' && comparison) previous = toCumulative(previous, keys)

    const comparing = Boolean(state.comparing && previous.length)
    const rows = comparing
      ? alignComparison(current, previous, keys, forecast.length ? forecast : undefined)
      : current.map(point => {
          const row = { date: point.date }
          keys.forEach(key => {
            row[key] = point[key]
          })
          return row
        })

    return { visible, keys, rows, projectionActive, comparing }
  }

  function chartSeries(visible) {
    return visible.map(item => ({
      key: item.dataKey,
      label: T[item.labelKey],
      color: item.color,
      axis: item.axis,
    }))
  }

  function drawPerformanceChart(container, report, comparison) {
    const model = performanceRows(report, comparison)
    if (!model.visible.length) return
    window.PocCharts.areaChart(container, {
      points: model.rows,
      series: chartSeries(model.visible),
      emptyText: T.daily_series_none_selected,
      ariaLabel: T.performance_chart_aria(
        fmtDate(report.period.startDate),
        fmtDate(report.period.endDate),
      ),
    })
  }

  // ─── Cards de KPI (também são os controles das séries) ─────────────────────
  function variationPill(variationPct, hasPrevious) {
    if (!hasPrevious) return null
    if (variationPct === null || variationPct === undefined) {
      return h('div', { class: 'pill pill--neutral' }, [h('span', { text: T.marketing_kpi_no_variation })])
    }
    if (variationPct === 0) {
      return h('div', { class: 'pill pill--neutral' }, [
        h('span', { text: signedPercent(0) }),
        h('span', { class: 'pill__suffix', text: T.marketing_kpi_previous_period }),
      ])
    }
    const good = variationPct > 0
    return h('div', { class: `pill ${good ? 'pill--good' : 'pill--bad'}` }, [
      h('span', { text: signedPercent(variationPct) }),
      h('span', { class: 'pill__suffix', text: T.marketing_kpi_previous_period }),
    ])
  }

  const STAGE_RATE_PHRASE = {
    leads: T.funnel_rate_of_visits,
    qualified_leads: T.funnel_rate_of_leads,
    opportunities: T.funnel_rate_of_qualified,
    sales: T.funnel_rate_of_opportunities,
  }

  function kpiCard({ id, label, help, value, previousValue, variationPct, stageRate, selectable }) {
    const card = h('div', {
      class: `card af-kpi-card${selectable ? ' af-kpi-toggle' : ''}`,
      'data-selected': selectable ? String(state.selected.has(id)) : null,
      onclick: selectable ? () => toggleSeries(id) : null,
    })

    const title = h('div', { class: 'af-metric-title' }, [
      selectable
        ? h(
            'span',
            {
              class: 'af-kpi-check',
              onclick: event => event.stopPropagation(),
              onkeydown: event => event.stopPropagation(),
            },
            [
              checkControl({
                checked: state.selected.has(id),
                onChange: () => toggleSeries(id),
                ariaLabel: T.marketing_kpi_series_toggle(label),
              }),
            ],
          )
        : null,
      h('h3', { text: label }),
      help
        ? h(
            'span',
            {
              onclick: event => event.stopPropagation(),
              onkeydown: event => event.stopPropagation(),
              style: 'display:inline-flex',
            },
            [helpButton(help)],
          )
        : null,
    ])

    card.appendChild(title)
    card.appendChild(h('p', { class: 'af-kpi-card__value', text: integer.format(value) }))
    const pill = variationPill(variationPct, previousValue !== null && previousValue !== undefined)
    if (pill) card.appendChild(pill)
    if (previousValue !== null && previousValue !== undefined) {
      card.appendChild(
        h('p', {
          class: 'af-kpi-card__previous',
          text: T.marketing_kpi_previous_amount(integer.format(previousValue)),
        }),
      )
    }
    if (stageRate !== null && stageRate !== undefined) {
      card.appendChild(
        h('p', {
          class: 'af-kpi-card__rate',
          text: `${pct2(stageRate)} ${STAGE_RATE_PHRASE[id]}`,
        }),
      )
    }
    return card
  }

  function unavailableVisitorCard() {
    return h('div', { class: 'card af-kpi-card', 'data-status': 'unavailable' }, [
      h('div', { class: 'af-metric-title' }, [
        h('h3', { text: T.funnel_stage_visits }),
        helpButton(T.funnel_stage_visits_help),
      ]),
      h('p', { class: 'af-kpi-card__message', text: T.visitors_not_connected }),
    ])
  }

  function kpiCards(report, selectable) {
    const cards = []
    if (report.visitors.connected) {
      cards.push(
        kpiCard({
          id: 'visits',
          label: T.funnel_stage_visits,
          help: T.funnel_stage_visits_help,
          value: report.visitors.total,
          previousValue: report.visitors.previousTotal,
          variationPct: report.visitors.variationPct,
          selectable,
        }),
      )
    } else {
      cards.push(unavailableVisitorCard())
    }

    const byId = new Map(report.stages.map(stage => [stage.id, stage]))
    const stageRate = (id, numerator, denominator) => {
      const base = byId.get(denominator)
      if (!base || !base.value) return null
      return numerator / base.value
    }

    const leads = byId.get('leads')
    const qualified = byId.get('qualified_leads')
    const opportunities = byId.get('opportunities')
    const sales = byId.get('sales')
    const visitorsRate =
      report.visitors.connected && report.visitors.total > 0
        ? leads.value / report.visitors.total
        : null

    const rateOf = {
      leads: visitorsRate,
      qualified_leads: stageRate('qualified_leads', qualified.value, 'leads'),
      opportunities: stageRate('opportunities', opportunities.value, 'qualified_leads'),
      sales: stageRate('sales', sales.value, 'opportunities'),
    }

    report.stages.forEach(stage => {
      cards.push(
        kpiCard({
          id: stage.id,
          label: T[`funnel_stage_${stage.id}`],
          help: T[`funnel_stage_${stage.id}_help`],
          value: stage.value,
          previousValue: stage.previousValue,
          variationPct: stage.variationPct,
          stageRate: rateOf[stage.id],
          selectable,
        }),
      )
    })

    return cards
  }

  function toggleSeries(id) {
    if (state.view === 'rates') return
    const next = new Set(state.selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    state.selected = next
    renderPanel()
  }

  // ─── Visão de taxas ────────────────────────────────────────────────────────
  function bandTrack(item) {
    if (item.low === null || item.high === null || item.observed === null) return null
    const domainMax = Math.max(item.high, item.observed) * 1.15 || 1
    const at = value => Math.min(100, Math.max(0, (value / domainMax) * 100))
    return h('div', { class: 'af-performance__band-track', 'aria-hidden': 'true' }, [
      h('div', {
        class: 'af-performance__band-range',
        style: `left:${at(item.low)}%;width:${Math.max(0, at(item.high) - at(item.low))}%`,
      }),
      h('div', {
        class: 'af-performance__band-dot',
        style: `left:${at(item.observed)}%;background:${BAND_MARK[item.band]}`,
      }),
    ])
  }

  function rateCards(report) {
    return h(
      'div',
      { class: 'af-performance__rate-cards' },
      RATE_DEFS.map(def => {
        const item = report.bands.find(entry => entry.id === def.key)
        const tone = BAND_PILL[item?.band] ?? BAND_PILL.insuficiente
        const card = h('div', { class: 'af-performance__rate-card' }, [
          h('div', { class: 'af-metric-title' }, [
            h('span', {
              class: 'af-daily-series-toggle__swatch',
              'aria-hidden': 'true',
              style: `--series-color: ${def.color}`,
            }),
            h('span', { class: 'af-performance__rate-label', text: T[def.labelKey] }),
            helpButton(T[def.helpKey]),
          ]),
          h('div', { class: 'af-performance__rate-value' }, [
            h('span', {
              class: 'af-performance__rate-number',
              text: item ? pct1(item.observed ?? 0) : '—',
            }),
            item
              ? h('span', {
                  class: 'af-performance__band-pill',
                  text: T[BAND_LABEL_KEY[item.band]],
                  style: `background:${tone.background};color:${tone.color}`,
                })
              : null,
          ]),
          item ? bandTrack(item) : null,
          item
            ? h('div', { class: 'af-performance__rate-note' }, [
                h('span', {
                  text:
                    item.band === 'insuficiente'
                      ? T.conversion_band_note_insufficient(item.trials)
                      : T.conversion_band_note(pct1(item.low ?? 0), pct1(item.high ?? 0)),
                }),
                item.band !== 'insuficiente' ? helpButton(T.conversion_band_note_help) : null,
              ])
            : null,
        ])
        return card
      }),
    )
  }

  // ─── Bloco de desempenho ───────────────────────────────────────────────────
  function renderPerformance(report, comparison) {
    const selectable = state.view !== 'rates'
    const section = h('section', {
      class: 'af-performance',
      'data-view': state.view,
      'aria-label': T.performance_title,
    })

    section.appendChild(
      h('div', { class: 'af-marketing-kpis' }, [
        h(
          'div',
          {
            class: 'af-marketing-kpis__grid',
            role: 'group',
            'aria-label': 'Indicadores de marketing',
          },
          kpiCards(report, selectable),
        ),
      ]),
    )

    const chartCard = h('div', { class: 'card af-performance__chart-card' })

    const controls = h('div', { class: 'af-performance__controls' }, [
      h(
        'div',
        {
          role: 'radiogroup',
          'aria-label': T.performance_view_label,
          class: 'af-performance__views',
        },
        [
          ['daily', T.performance_view_daily],
          ['cumulative', T.performance_view_cumulative],
          ['rates', T.performance_view_rates],
        ].map(([id, label]) =>
          h('button', {
            type: 'button',
            role: 'radio',
            class: 'af-performance__view',
            'data-selected': String(state.view === id),
            'aria-checked': String(state.view === id),
            text: label,
            onclick: () => {
              if (state.view === id) return
              state.view = id
              renderPanel()
            },
          }),
        ),
      ),
      state.view !== 'rates'
        ? h('div', { class: 'af-performance__compare' }, [
            checkControl({
              checked: state.comparing,
              onChange: () => {
                state.comparing = !state.comparing
                renderPanel()
              },
              label: T.performance_compare_toggle,
            }),
            state.comparing ? helpButton(T.performance_compare_help) : null,
          ])
        : null,
    ])
    chartCard.appendChild(controls)

    if (state.view === 'rates') {
      chartCard.appendChild(
        h('p', { class: 'af-performance__rates-subtitle', text: T.conversion_bands_subtitle }),
      )
      chartCard.appendChild(
        report.bandsAllowed
          ? rateCards(report)
          : h('p', { class: 'af-performance__blocked', text: T.conversion_bands_period_limit }),
      )
    } else {
      const visible = visibleSeries(report)
      if (!visible.length) {
        chartCard.appendChild(
          h('p', { class: 'af-performance__none', text: T.daily_series_none_selected }),
        )
      } else {
        const chart = h('div', { class: 'af-performance__chart' })
        chartCard.appendChild(chart)
        const draw = () => drawPerformanceChart(chart, report, comparison)
        requestAnimationFrame(draw)
        chartDraws.push(draw)
      }
    }

    const previousWindow =
      state.comparing && comparison
        ? comparison.period
        : null
    chartCard.appendChild(
      h('p', {
        class: 'af-performance__source',
        text: previousWindow
          ? T.real_funnel_source_with_comparison(
              fmtDate(report.period.startDate),
              fmtDate(report.period.endDate),
              fmtDate(previousWindow.startDate),
              fmtDate(previousWindow.endDate),
            )
          : T.real_funnel_source(fmtDate(report.period.startDate), fmtDate(report.period.endDate)),
      }),
    )

    section.appendChild(chartCard)
    return section
  }

  // ─── Conversões ────────────────────────────────────────────────────────────
  function periodLine(report) {
    return h('p', {
      class: 'block-period',
      text: T.conv_period(fmtDate(report.period.startDate), fmtDate(report.period.endDate)),
    })
  }

  function numberBlock(report, title, hint, value) {
    return h('section', { class: 'conv-number-block' }, [
      h('div', {}, [metricTitle(title, hint), periodLine(report)]),
      h('div', { class: 'card conv-number-card' }, [
        h('p', { class: 'conv-number-card__hint', text: hint }),
        h('p', { class: 'conv-number-card__value', text: integer.format(value) }),
      ]),
    ])
  }

  function renderConversionKpis(report) {
    return h('div', { class: 'af-conversion-kpis' }, [
      h('div', { class: 'af-conversion-kpis__grid' }, [
        numberBlock(
          report,
          T.conv_qualified_title,
          T.conv_qualified_hint,
          report.conversions.qualifiedLeads.value,
        ),
        numberBlock(
          report,
          T.conv_opportunities_title,
          T.conv_opportunities_hint,
          report.conversions.opportunities.value,
        ),
      ]),
    ])
  }

  function seriesToggle({ checked, onChange, label, count, color, ariaLabel }) {
    // Um único <label> em volta de tudo: clicar no nome também liga/desliga a
    // série. (Um label do checkbox dentro de outro label seria HTML inválido.)
    return h(
      'div',
      {
        class: 'af-daily-series-toggle',
        'data-selected': String(checked),
        style: `--series-color: ${color || 'var(--neutral-icon-low-emphasis)'}`,
      },
      [
        h('label', { class: 'af-daily-series-toggle__label' }, [
          h('input', {
            class: 'check-input',
            type: 'checkbox',
            checked: checked ? 'checked' : null,
            'aria-label': ariaLabel || label,
            onchange: onChange,
          }),
          h('span', { class: 'checkbox', html: ICONS.check }),
          h('span', { class: 'af-daily-series-toggle__copy' }, [
            h('span', { class: 'af-daily-series-toggle__name', text: label }),
            count !== null && count !== undefined
              ? h('span', { class: 'af-daily-series-toggle__count', text: integer.format(count) })
              : null,
            color ? h('span', { class: 'af-daily-series-toggle__swatch', 'aria-hidden': 'true' }) : null,
          ]),
        ]),
      ],
    )
  }

  function renderConversionTime(report) {
    const points = report.conversions.byDay
    const today = localTodayIso()
    const selected = state.convSelected
    const visible = CONV_SERIES.filter(item => selected.has(item.dataKey))
    const keys = visible.map(item => item.dataKey)

    const totals = points.reduce(
      (acc, point) => ({
        conversions: acc.conversions + point.conversions,
        opportunities: acc.opportunities + point.opportunities,
        customers: acc.customers + point.customers,
      }),
      { conversions: 0, opportunities: 0, customers: 0 },
    )

    const projection = keys.length
      ? withMonthProjection(points, keys, today)
      : { points: [], active: false }
    const projectedOn = state.convProjection && projection.active
    const chartPoints = projectedOn ? projection.points : points

    const toggles = h('div', {
      class: 'af-conversion-series-toggles',
      role: 'group',
      'aria-label': T.daily_series_toggle_group,
    })

    CONV_SERIES.forEach(item => {
      toggles.appendChild(
        seriesToggle({
          checked: selected.has(item.dataKey),
          onChange: () => {
            const next = new Set(state.convSelected)
            if (next.has(item.dataKey)) next.delete(item.dataKey)
            else next.add(item.dataKey)
            state.convSelected = next
            renderPanel()
          },
          label: T[item.labelKey],
          count: totals[item.dataKey],
          color: item.color,
        }),
      )
    })

    if (projection.active) {
      toggles.appendChild(
        seriesToggle({
          checked: projectedOn,
          onChange: () => {
            state.convProjection = !state.convProjection
            renderPanel()
          },
          label: T.daily_projection_toggle,
          count: null,
          color: null,
        }),
      )
    }

    if (projectedOn) {
      toggles.appendChild(
        h('p', { class: 'af-daily-series-scale-note', text: T.daily_projection_help }),
      )
    }

    const card = h('div', { class: 'card af-conversion-chart-card' }, [toggles])
    if (!visible.length) {
      card.appendChild(
        h('p', { class: 'af-performance__none', text: T.daily_series_none_selected }),
      )
    } else {
      const chart = h('div', { class: 'af-conversion-chart' })
      card.appendChild(chart)
      const draw = () =>
        window.PocCharts.areaChart(chart, {
          points: chartPoints,
          series: chartSeries(visible),
          emptyText: T.daily_series_none_selected,
          ariaLabel: T.conv_over_time_aria(
            fmtDate(report.period.startDate),
            fmtDate(report.period.endDate),
          ),
          forecastDash: '5 4',
        })
      requestAnimationFrame(draw)
      chartDraws.push(draw)
    }

    return h('section', { class: 'af-daily-series' }, [
      h('div', {}, [
        metricTitle(T.conv_over_time_title, T.conv_over_time_hint),
        periodLine(report),
        h('p', { class: 'af-conversion-chart-hint', text: T.conv_over_time_hint }),
      ]),
      card,
    ])
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
    { id: 'sends', labelKey: 'email_tab_sends', titleKey: 'email_sends_title' },
    { id: 'recent', labelKey: 'email_tab_recent', titleKey: 'email_recent_title' },
    { id: 'clicks', labelKey: 'email_tab_clicks', titleKey: 'email_clicks_title' },
  ]

  function emailMetricCard(metric) {
    const value =
      metric.value === null || metric.value === undefined
        ? '—'
        : metric.isPercent
          ? `${percentFixed2.format(metric.value)}%`
          : integer.format(metric.value)
    return h('div', { class: 'card af-email-card' }, [
      h('div', { class: 'af-metric-title' }, [
        h('h4', { text: T[`email_metric_${metric.id}`] }),
        helpButton(T[`email_metric_${metric.id}_help`]),
      ]),
      h('p', {
        class: `af-email-card__value${metric.value === null || metric.value === undefined ? ' af-email-card__value--empty' : ''}`,
        text: value,
      }),
    ])
  }

  function emailTable(rows) {
    const headers = [
      'email_col_campaign',
      'email_col_type',
      'email_col_sent_at',
      'email_col_sent',
      'email_col_delivered',
      'email_col_opened',
      'email_col_open_rate',
      'email_col_clicked',
      'email_col_click_rate',
    ]

    const head = h('thead', {}, [
      h(
        'tr',
        {},
        headers.map(key => h('th', { scope: 'col', text: T[key] })),
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
            text:
              row.openRate === null || row.openRate === undefined
                ? '—'
                : `${percentFixed2.format(row.openRate)}%`,
          }),
          h('td', { class: 'num', text: integer.format(row.clicked ?? 0) }),
          h('td', {
            class: 'num muted',
            text:
              row.clickRate === null || row.clickRate === undefined
                ? '—'
                : `${percentFixed2.format(row.clickRate)}%`,
          }),
        ]),
      ),
    )

    return h('div', { class: 'table-scroll' }, [
      h('table', { class: 'campaigns' }, [
        h('caption', { class: 'sr-only', text: T.email_recent_caption }),
        head,
        body,
      ]),
    ])
  }

  function renderEmail(report) {
    const email = report.email
    const section = h('section', { class: 'af-email-report', 'aria-label': T.email_report_title })

    section.appendChild(
      h('div', { class: 'af-block-head' }, [
        metricTitle(T.email_report_title, T.email_report_help),
        h('p', {
          class: 'block-period',
          text: T.email_report_period(
            fmtDate(email.period.startDate),
            fmtDate(email.period.endDate),
          ),
        }),
      ]),
    )

    section.appendChild(
      h('div', { class: 'af-marketing-kpis' }, [
        h(
          'div',
          { class: 'af-email-kpis__grid' },
          EMAIL_METRIC_ORDER.map(id => {
            const metric = email.metrics.find(item => item.id === id)
            return metric ? emailMetricCard(metric) : null
          }),
        ),
      ]),
    )

    section.appendChild(h('p', { class: 'af-email-scope-note', text: T.email_report_scope_note }))

    const availableTabs = EMAIL_TABS.filter(tab => email.tables[tab.id])
    const current = availableTabs.find(tab => tab.id === state.emailTab) || availableTabs[0]
    const rows = email.tables[current.id].rows ?? []

    const tablist = h(
      'div',
      { class: 'af-tablist', role: 'tablist' },
      availableTabs.map(tab =>
        h('button', {
          class: 'af-tab',
          type: 'button',
          role: 'tab',
          'aria-selected': String(tab.id === current.id),
          text: T[tab.labelKey],
          onclick: () => {
            state.emailTab = tab.id
            renderPanel()
          },
        }),
      ),
    )

    section.appendChild(
      h('div', { class: 'af-campaign-tabs' }, [
        tablist,
        h('div', { class: 'af-tab-content', role: 'tabpanel' }, [
          h('h4', { text: T[current.titleKey] }),
          rows.length
            ? emailTable(rows)
            : h('p', {
                class: 'af-campaigns-empty',
                text: current.id === 'recent' ? T.email_empty_recent : T.email_empty_generic,
              }),
        ]),
      ]),
    )

    return section
  }

  // ─── Estado da página ──────────────────────────────────────────────────────
  const REPORT_IDS = ['captacao', 'emails']

  function defaultSelection() {
    return new Set(SERIES.filter(item => item.id !== 'visits').map(item => item.id))
  }

  const state = {
    report: 'captacao',
    range: data.defaultRange(),
    visitorsConnected: true,
    view: 'daily',
    selected: defaultSelection(),
    comparing: false,
    emailTab: 'sends',
    convSelected: new Set(CONV_SERIES.map(item => item.dataKey)),
    convProjection: false,
  }

  const nodes = {
    title: document.getElementById('page-title'),
    panel: document.getElementById('panel-content'),
    periodRow: document.getElementById('period-row'),
    scenario: document.getElementById('poc-scenario'),
    scenarioControls: document.getElementById('poc-scenario-controls'),
    scenarioToggle: document.getElementById('poc-scenario-toggle'),
    navItems: Array.from(document.querySelectorAll('.af-reports__item')),
  }

  const chartDraws = []
  let resizeFrame = null

  function resetReportState() {
    state.view = 'daily'
    state.comparing = false
    state.selected = defaultSelection()
    state.emailTab = 'sends'
    state.convSelected = new Set(CONV_SERIES.map(item => item.dataKey))
    state.convProjection = false
  }

  function updateNav() {
    nodes.navItems.forEach(item => {
      if (item.dataset.report === state.report) item.setAttribute('aria-current', 'page')
      else item.removeAttribute('aria-current')
    })
  }

  function renderHeader() {
    const title = state.report === 'emails' ? T.report_emails_title : T.report_captacao_title
    nodes.title.textContent = title
    document.title = `${title} — protótipo`
    // O simulador de "conta sem GA" só faz sentido na captação, onde o card de
    // visitantes existe.
    if (nodes.scenarioControls) nodes.scenarioControls.hidden = state.report === 'emails'
  }

  // O período anterior da sobreposição é uma segunda leitura da MESMA base: no
  // mês corrente ele é o mês fechado; nas demais janelas, a janela anterior de
  // mesma duração.
  function comparisonReport(report) {
    if (!state.comparing) return null
    const range = data.comparisonRange(report.period.startDate, report.period.endDate)
    if (!range) return null
    return data.load(range.startDate, range.endDate)
  }

  function renderPanel() {
    chartDraws.length = 0
    const loaded = data.load(state.range.startDate, state.range.endDate)
    // Conta sem GA: o card de visitantes explica a ausência e a série sai do
    // gráfico — o resto do funil continua igual.
    const report = state.visitorsConnected
      ? loaded
      : { ...loaded, visitors: { connected: false, byDay: [] } }

    if (state.report === 'emails') {
      nodes.panel.replaceChildren(renderEmail(report))
      return
    }

    const comparison = comparisonReport(report)
    nodes.panel.replaceChildren(
      renderPerformance(report, comparison),
      renderConversionKpis(report),
      renderConversionTime(report),
    )
  }

  function writeReportQuery(id) {
    const params = new URLSearchParams(window.location.search)
    params.set('relatorio', id)
    params.delete('panel')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function setReport(id) {
    if (!REPORT_IDS.includes(id) || id === state.report) return
    state.report = id
    resetReportState()
    // A conta de visitantes volta ao padrão ao trocar de relatório? Não: o
    // estado simulado é do rodapé e vale para a sessão inteira.
    updateNav()
    renderHeader()
    writeReportQuery(id)
    renderPanel()
  }

  // ─── Inicialização ─────────────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('relatorio')
  if (REPORT_IDS.includes(requested)) state.report = requested
  // `?panel=vendas` continua existindo em links antigos; com a seção de vendas
  // desligada ele cai na captação, sem abrir uma tela escondida.
  if (params.get('panel') === 'vendas' || !REPORT_IDS.includes(requested)) {
    writeReportQuery(state.report)
  }

  updateNav()
  renderHeader()

  createPeriodPicker(nodes.periodRow, state, range => {
    // Muta o MESMO objeto que o seletor guardou: substituir `state.range` por
    // outro objeto deixaria o picker com a referência antiga.
    state.range.startDate = range.startDate
    state.range.endDate = range.endDate
    state.convProjection = false
    renderPanel()
  })

  nodes.navItems.forEach(item => {
    item.addEventListener('click', () => setReport(item.dataset.report))
  })

  function applyScenario() {
    nodes.scenario.textContent = state.visitorsConnected
      ? 'Google Analytics conectado.'
      : 'Simulando conta sem Google Analytics.'
    nodes.scenarioToggle.textContent = state.visitorsConnected
      ? 'Simular conta sem Google Analytics'
      : 'Simular conta com Google Analytics'
  }

  nodes.scenarioToggle.addEventListener('click', () => {
    state.visitorsConnected = !state.visitorsConnected
    applyScenario()
    renderPanel()
  })

  applyScenario()
  renderPanel()

  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null
      chartDraws.forEach(draw => draw())
    })
  })
})()
