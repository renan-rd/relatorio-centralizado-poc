// Gráficos em SVG puro.
//
// A tela real usa recharts 3. Aqui não há build nem dependências (a página é
// estática, servida pelo GitHub Pages), então o necessário do recharts foi
// reimplementado: curva monotônica (a mesma `curveMonotoneX` do d3, que o
// recharts usa em `type="monotone"`), grid tracejado, eixos com os mesmos
// formatos e o tooltip com cursor vertical na posição do mouse.
(function () {
  'use strict'

  const SVG_NS = 'http://www.w3.org/2000/svg'

  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name)
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value !== null && value !== undefined) node.setAttribute(key, value)
      })
    }
    return node
  }

  // ─── Curva monotônica (d3 curveMonotoneX) ─────────────────────────────────
  const sign = x => (x < 0 ? -1 : 1)

  function slope3(x0, y0, x1, y1, x2, y2) {
    const h0 = x1 - x0
    const h1 = x2 - x1
    const s0 = h0 === 0 ? 0 : (y1 - y0) / h0
    const s1 = h1 === 0 ? 0 : (y2 - y1) / h1
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1)
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }

  function slope2(x0, y0, x1, y1, t) {
    const h = x1 - x0
    return h ? (3 * (y1 - y0)) / h - t / 2 : t
  }

  // Devolve o `d` de uma linha monotônica passando pelos pontos [{x, y}].
  function monotoneLine(points) {
    if (!points.length) return ''
    if (points.length === 1) return `M${points[0].x},${points[0].y}`
    if (points.length === 2) {
      return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`
    }

    let d = `M${points[0].x},${points[0].y}`
    let t0 = slope3(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y)
    d += bezier(points[0], points[1], slope2(points[0].x, points[0].y, points[1].x, points[1].y, t0), t0)

    for (let i = 2; i < points.length; i += 1) {
      const t1 = slope3(
        points[i - 2].x,
        points[i - 2].y,
        points[i - 1].x,
        points[i - 1].y,
        points[i].x,
        points[i].y,
      )
      d += bezier(points[i - 1], points[i], t0, t1)
      t0 = t1
    }
    return d
  }

  function bezier(from, to, t0, t1) {
    const dx = (to.x - from.x) / 3
    return `C${from.x + dx},${from.y + dx * t0},${to.x - dx},${to.y - dx * t1},${to.x},${to.y}`
  }

  function monotoneArea(points, baseline) {
    if (points.length < 2) return ''
    return `${monotoneLine(points)}L${points[points.length - 1].x},${baseline}L${points[0].x},${baseline}Z`
  }

  // ─── Escalas ──────────────────────────────────────────────────────────────
  // "Nice ticks" no espírito do recharts: 5 passos com passo 1/2/5×10^n.
  function niceTicks(max, count = 5) {
    if (!(max > 0)) return [0, 1]
    const rough = max / (count - 1)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
    const residual = rough / magnitude
    const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude
    const ticks = []
    for (let value = 0; value <= Math.ceil(max / step) * step + step / 2; value += step) {
      ticks.push(Math.round(value))
    }
    return ticks
  }

  const integerFormat = new Intl.NumberFormat('pt-BR')
  const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
  const dateFormat = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR')

  // ─── Gráfico de área com eixo e tooltip ───────────────────────────────────
  // `series` = [{ key, label, color }]. Mesma anatomia do recharts: 56px de
  // eixo Y à esquerda, 30px de eixo X embaixo, margem de 8px no topo/direita.
  function areaChart(container, options) {
    const { points, series, height, ariaLabel, emptyText } = options
    container.classList.add('chart')
    container.style.height = `${height}px`
    container.innerHTML = ''

    if (!points.length || !series.length) {
      const empty = document.createElement('p')
      empty.className = 'empty-chart'
      empty.textContent = emptyText || 'Selecione ao menos uma série para comparar.'
      container.appendChild(empty)
      return
    }

    if (ariaLabel) container.setAttribute('aria-label', ariaLabel)
    container.setAttribute('role', 'img')

    const width = Math.max(280, container.clientWidth || 800)
    const margin = { top: 8, right: 8, bottom: 30, left: 56 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const maxValue = Math.max(
      1,
      ...points.flatMap(point => series.map(item => point[item.key] ?? 0)),
    )
    const ticks = niceTicks(maxValue)
    const domainMax = ticks[ticks.length - 1] || maxValue

    const xAt = index =>
      margin.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
    const yAt = value => margin.top + innerHeight - (value / domainMax) * innerHeight

    const svg = el('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      'aria-hidden': 'true',
      focusable: 'false',
    })

    // Grid horizontal tracejado em cada tick do eixo Y.
    const grid = el('g', { class: 'chart__grid' })
    ticks.forEach(value => {
      grid.appendChild(
        el('line', {
          x1: margin.left,
          x2: width - margin.right,
          y1: yAt(value),
          y2: yAt(value),
        }),
      )
    })
    svg.appendChild(grid)

    // Eixo X: linha de base sólida, sem tick marks.
    svg.appendChild(
      el('line', {
        class: 'chart__axis-line',
        x1: margin.left,
        x2: width - margin.right,
        y1: height - margin.bottom,
        y2: height - margin.bottom,
      }),
    )

    // Labels do eixo X: primeiro e último sempre; o resto no passo que couber.
    // O último é reservado antes de desenhar os demais, senão um label do passo
    // regular cai quase em cima dele ("29/10/202628/10/2026").
    const labelWidth = 78
    const maxTicks = Math.max(2, Math.floor(innerWidth / labelWidth))
    const step = Math.max(1, Math.ceil((points.length - 1) / (maxTicks - 1)))
    const lastIndex = points.length - 1
    const lastX = xAt(lastIndex)
    const drawn = []
    points.forEach((point, index) => {
      const isFirst = index === 0
      const isLast = index === lastIndex
      if (!isFirst && !isLast && index % step !== 0) return
      // Um label regular perto demais do último sai de cena: o último é âncora.
      if (!isLast && lastIndex - index < step && lastX - xAt(index) < labelWidth) return
      if (drawn.some(x => Math.abs(x - xAt(index)) < labelWidth)) return
      drawn.push(xAt(index))
      const text = el('text', {
        class: 'chart__tick',
        x: xAt(index),
        y: height - margin.bottom + 18,
        'text-anchor': 'middle',
      })
      text.textContent = dateFormat(point.date)
      svg.appendChild(text)
    })

    // Labels do eixo Y, alinhados à direita da coluna de 56px.
    ticks.forEach(value => {
      const text = el('text', {
        class: 'chart__tick',
        x: margin.left - 12,
        y: yAt(value) + 4,
        'text-anchor': 'end',
      })
      text.textContent = integerFormat.format(value)
      svg.appendChild(text)
    })

    // Cursor vertical do tooltip.
    const cursor = el('line', {
      class: 'chart__cursor',
      y1: margin.top,
      y2: height - margin.bottom,
      opacity: '0',
    })
    svg.appendChild(cursor)

    // Áreas — na ordem das séries, então a menor é desenhada por cima.
    series.forEach(item => {
      const path = points.map((point, index) => ({
        x: xAt(index),
        y: yAt(point[item.key] ?? 0),
      }))
      svg.appendChild(
        el('path', {
          d: monotoneArea(path, height - margin.bottom),
          fill: item.color,
          'fill-opacity': '0.2',
        }),
      )
      svg.appendChild(
        el('path', {
          d: monotoneLine(path),
          fill: 'none',
          stroke: item.color,
          'stroke-width': '2',
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        }),
      )
    })

    container.appendChild(svg)

    // ─── Tooltip ────────────────────────────────────────────────────────────
    const tooltip = document.createElement('div')
    tooltip.className = 'chart-tooltip'
    container.appendChild(tooltip)

    const showAt = index => {
      const point = points[index]
      const x = xAt(index)
      const left = Math.min(Math.max(x, 70), width - 70)
      cursor.setAttribute('x1', x)
      cursor.setAttribute('x2', x)
      cursor.setAttribute('opacity', '1')

      const rows = series
        .map(item => {
          const label = item.label
          const value = integerFormat.format(point[item.key] ?? 0)
          return `<p class="chart-tooltip__row">${label}: ${value}</p>`
        })
        .join('')

      const topValue = Math.max(...series.map(item => point[item.key] ?? 0))
      tooltip.innerHTML = `<p class="chart-tooltip__date">${dateFormat(point.date)}</p>${rows}`
      tooltip.style.left = `${left}px`
      tooltip.style.top = `${Math.max(46, yAt(topValue) - 12)}px`
      tooltip.style.opacity = '1'
    }

    const hide = () => {
      cursor.setAttribute('opacity', '0')
      tooltip.style.opacity = '0'
    }

    container.addEventListener('mousemove', event => {
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left - margin.left
      const ratio = innerWidth === 0 ? 0 : x / innerWidth
      const index = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))))
      showAt(index)
    })
    container.addEventListener('mouseleave', hide)
  }

  // ─── Sparkline dos cards ──────────────────────────────────────────────────
  // Desenha `level` (0–100) numa escala fixa, como a tela real: a curva é
  // forma, não leitura — o valor honesto vai no tooltip.
  let sparkGradientId = 0

  function sparkline(container, trend) {
    container.innerHTML = ''
    if (trend.length < 2) {
      container.classList.add('kpi-card__spark-single')
      container.textContent = 'Dados insuficientes para exibir a evolução em gráfico.'
      return
    }

    const height = 132
    const width = Math.max(120, container.clientWidth || 240)
    const gradientId = `spark-${(sparkGradientId += 1)}`

    const xAt = index => (index / (trend.length - 1)) * width
    const yAt = level => height - 4 - (level / 100) * (height - 8)
    const path = trend.map((point, index) => ({ x: xAt(index), y: yAt(point.level) }))

    const svg = el('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
    })

    const defs = el('defs')
    const gradient = el('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' })
    gradient.appendChild(
      el('stop', {
        offset: '0%',
        'stop-color': 'var(--neutral-icon-low-emphasis)',
        'stop-opacity': '0.18',
      }),
    )
    gradient.appendChild(
      el('stop', {
        offset: '100%',
        'stop-color': 'var(--neutral-icon-low-emphasis)',
        'stop-opacity': '0.02',
      }),
    )
    defs.appendChild(gradient)
    svg.appendChild(defs)

    svg.appendChild(
      el('path', {
        d: monotoneArea(path, height),
        fill: `url(#${gradientId})`,
      }),
    )
    svg.appendChild(
      el('path', {
        d: monotoneLine(path),
        fill: 'none',
        stroke: 'var(--neutral-icon-low-emphasis)',
        'stroke-width': '2.5',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        'vector-effect': 'non-scaling-stroke',
      }),
    )

    container.appendChild(svg)

    const tooltip = document.createElement('div')
    tooltip.className = 'spark-tooltip'
    container.appendChild(tooltip)

    container.addEventListener('mousemove', event => {
      const rect = container.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      const index = Math.min(trend.length - 1, Math.max(0, Math.round(ratio * (trend.length - 1))))
      const point = trend[index]
      tooltip.innerHTML =
        `<span class="spark-tooltip__value">${integerFormat.format(point.value)}</span>` +
        `<span class="spark-tooltip__date">${dateFormat(point.date)}</span>`
      tooltip.style.left = `${Math.min(Math.max(xAt(index), 50), width - 50)}px`
      tooltip.style.top = `${yAt(point.level) - 8}px`
      tooltip.style.opacity = '1'
    })
    container.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0'
    })
  }

  // Re-renderiza os gráficos quando a largura muda (o recharts faz o mesmo
  // via ResponsiveContainer).
  function observeResize(target, render) {
    let frame = null
    const observer = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = null
        render()
      })
    })
    observer.observe(target)
  }

  window.PocCharts = {
    areaChart,
    sparkline,
    monotoneLine,
    niceTicks,
    observeResize,
    formats: { integer: integerFormat, percent: percentFormat, date: dateFormat },
  }
})()
