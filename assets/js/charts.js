// Gráficos em SVG puro.
//
// A tela real usa recharts 3. Aqui não há build nem dependências (a página é
// estática, servida pelo GitHub Pages), então o necessário do recharts foi
// reimplementado: curva monotônica (a mesma `curveMonotoneX` do d3, que o
// recharts usa em `type="monotone"`), grid tracejado, eixos com os mesmos
// formatos, eixo duplo para visitantes, séries de referência (período anterior
// e projeção) e tooltip com cursor vertical na posição do mouse.
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
  // "Nice ticks" no espírito do recharts: até 5 passos, com multiplicadores
  // 1 / 1,5 / 2 / 2,5 / 3 / 4 / 5 / 7 / 10 × 10^n. É o que faz o eixo de
  // 0–6.000 cair em 0 / 1.500 / 3.000 / 4.500 / 6.000, como na tela real.
  const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 7, 10]

  function niceTicks(max, count = 5) {
    if (!(max > 0)) return [0, 1]
    const rough = max / (count - 1)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
    const residual = rough / magnitude
    const multiplier = STEPS.find(step => step >= residual - 1e-9) ?? 10
    const step = multiplier * magnitude
    const ticks = []
    for (let value = 0; value <= Math.ceil(max / step) * step + step / 2; value += step) {
      ticks.push(Math.round(value))
    }
    return ticks
  }

  const integerFormat = new Intl.NumberFormat('pt-BR')
  const dateFormat = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR')
  const labelFor = iso => (iso && iso.startsWith('D') ? iso : dateFormat(iso))

  // ─── Série em trechos (quebra nos nulls) ──────────────────────────────────
  // O recharts com `connectNulls={false}` interrompe o traço onde o valor é
  // null — é o que separa o medido da projeção. Aqui os trechos contíguos são
  // desenhados separadamente.
  function segments(points, xAt, yAt, key) {
    const result = []
    let run = []
    points.forEach((point, index) => {
      const value = point[key]
      if (value === null || value === undefined) {
        if (run.length) result.push(run)
        run = []
        return
      }
      run.push({ x: xAt(index), y: yAt(value), value })
    })
    if (run.length) result.push(run)
    return result
  }

  // ─── Gráfico de área com eixos, referências e tooltip ─────────────────────
  // `series` = [{ key, label, color, axis: 'left' | 'right' }].
  // Cada ponto pode trazer `keyPrevious` (referência) e `keyForecast`
  // (projeção), além de `projected: true` nos dias projetados.
  function areaChart(container, options) {
    const { points, series, ariaLabel, emptyText, forecastDash = '2 3' } = options
    container.classList.add('chart')
    container.replaceChildren()

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
    const height = Math.max(160, container.clientHeight || 320)
    const hasRightAxis = series.some(item => item.axis === 'right')
    const margin = { top: 8, right: hasRightAxis ? 56 : 32, bottom: 30, left: 56 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const valuesOf = axis =>
      points.flatMap(point =>
        series
          .filter(item => (item.axis === 'right') === (axis === 'right'))
          .flatMap(item => [point[item.key], point[`${item.key}Previous`], point[`${item.key}Forecast`]]),
      )
    const maxValue = axis => Math.max(1, ...valuesOf(axis).filter(value => typeof value === 'number'))

    const leftTicks = niceTicks(maxValue('left'))
    const rightTicks = hasRightAxis ? niceTicks(maxValue('right'), 4) : []
    const leftMax = leftTicks[leftTicks.length - 1] || 1
    const rightMax = rightTicks[rightTicks.length - 1] || 1

    const xAt = index =>
      margin.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
    const yAt = (value, axis = 'left') =>
      margin.top +
      innerHeight -
      (value / (axis === 'right' ? rightMax : leftMax)) * innerHeight

    const svg = el('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      'aria-hidden': 'true',
      focusable: 'false',
    })

    // Grid horizontal tracejado em cada tick do eixo esquerdo.
    const grid = el('g', { class: 'chart__grid' })
    leftTicks.forEach(value => {
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
    // Na sobreposição os rótulos são "D1", "D2"… (curto), então cabem muito
    // mais do que as datas completas.
    const labelWidth = points.some(point => String(point.date).startsWith('D')) ? 38 : 78
    const maxTicks = Math.max(2, Math.floor(innerWidth / labelWidth))
    const step = Math.max(1, Math.ceil((points.length - 1) / (maxTicks - 1)))
    const lastIndex = points.length - 1
    const lastX = xAt(lastIndex)
    const drawn = []
    points.forEach((point, index) => {
      const isFirst = index === 0
      const isLast = index === lastIndex
      if (!isFirst && !isLast && index % step !== 0) return
      if (!isLast && lastIndex - index < step && lastX - xAt(index) < labelWidth) return
      if (drawn.some(x => Math.abs(x - xAt(index)) < labelWidth)) return
      drawn.push(xAt(index))
      const text = el('text', {
        class: 'chart__tick',
        x: xAt(index),
        y: height - margin.bottom + 18,
        'text-anchor': 'middle',
      })
      text.textContent = labelFor(point.date)
      svg.appendChild(text)
    })

    // Labels do eixo Y, alinhados à direita da coluna de 56px.
    leftTicks.forEach(value => {
      const text = el('text', {
        class: 'chart__tick',
        x: margin.left - 12,
        y: yAt(value) + 4,
        'text-anchor': 'end',
      })
      text.textContent = integerFormat.format(value)
      svg.appendChild(text)
    })

    // Eixo direito (visitantes): outra ordem de grandeza, na cor da série.
    if (hasRightAxis) {
      rightTicks.forEach(value => {
        const text = el('text', {
          class: 'chart__tick chart__tick--right',
          x: width - margin.right + 12,
          y: yAt(value, 'right') + 4,
          'text-anchor': 'start',
        })
        text.textContent = integerFormat.format(value)
        svg.appendChild(text)
      })
    }

    // Cursor vertical do tooltip.
    const cursor = el('line', {
      class: 'chart__cursor',
      y1: margin.top,
      y2: height - margin.bottom,
      opacity: '0',
    })
    svg.appendChild(cursor)

    const drawSeries = (item, key, options_) => {
      const { dashed, fill, opacity } = options_
      const runs = segments(points, xAt, yAtBySeries(item), key)
      runs.forEach(run => {
        if (run.length === 1) {
          svg.appendChild(
            el('circle', {
              cx: run[0].x,
              cy: run[0].y,
              r: 3,
              fill: item.color,
              opacity: opacity ?? 1,
            }),
          )
          return
        }
        if (fill) {
          svg.appendChild(
            el('path', {
              d: monotoneArea(run, height - margin.bottom),
              fill: item.color,
              'fill-opacity': '0.2',
            }),
          )
        }
        svg.appendChild(
          el('path', {
            d: monotoneLine(run),
            fill: 'none',
            stroke: item.color,
            'stroke-width': '2',
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            'stroke-dasharray': dashed || null,
            opacity: opacity ?? 1,
          }),
        )
      })
    }

    function yAtBySeries(item) {
      return value =>
        item.axis === 'right' ? yAt(value, 'right') : yAt(value, 'left')
    }

    // Áreas — na ordem das séries, então a menor é desenhada por cima.
    series.forEach(item => {
      drawSeries(item, item.key, { fill: true })
    })
    // Período anterior: mesma cor, tracejado e sem preenchimento.
    series.forEach(item => {
      if (points.some(point => point[`${item.key}Previous`] != null)) {
        drawSeries(item, `${item.key}Previous`, { dashed: '5 4', opacity: 0.55 })
      }
    })
    // Projeção: pontilhado próprio, sem preenchimento.
    series.forEach(item => {
      if (points.some(point => point[`${item.key}Forecast`] != null)) {
        drawSeries(item, `${item.key}Forecast`, { dashed: forecastDash, opacity: 0.9 })
      }
    })

    container.appendChild(svg)

    // ─── Tooltip ────────────────────────────────────────────────────────────
    const tooltip = document.createElement('div')
    tooltip.className = 'chart-tooltip'
    container.appendChild(tooltip)

    const hasComparison = points.some(point =>
      series.some(item => point[`${item.key}Previous`] != null),
    )

    const valueOfPoint = (point, item) => {
      const current = point[item.key]
      if (current !== null && current !== undefined) return { value: current, projected: false }
      const forecast = point[`${item.key}Forecast`]
      if (forecast !== null && forecast !== undefined) return { value: forecast, projected: true }
      return null
    }

    const showAt = index => {
      const point = points[index]
      const x = xAt(index)
      const left = Math.min(Math.max(x, 80), width - 80)
      cursor.setAttribute('x1', x)
      cursor.setAttribute('x2', x)
      cursor.setAttribute('opacity', '1')

      const rowNodes = series.map(item => {
        const current = valueOfPoint(point, item)
        const previous = point[`${item.key}Previous`]
        const row = document.createElement('p')
        row.className = 'chart-tooltip__row'
        const name = `${item.label}: `
        if (!current) {
          row.textContent = `${name}—`
        } else if (current.projected) {
          row.textContent = `${name}≈ ${integerFormat.format(current.value)}`
        } else {
          row.textContent = `${name}${integerFormat.format(current.value)}`
        }
        if (hasComparison && !current?.projected) {
          const suffix = document.createElement('span')
          suffix.className = 'chart-tooltip__previous'
          suffix.textContent =
            previous === null || previous === undefined
              ? ' (antes: —)'
              : ` (antes: ${integerFormat.format(previous)})`
          row.appendChild(suffix)
        }
        return row
      })

      const dateNode = document.createElement('p')
      dateNode.className = 'chart-tooltip__date'
      dateNode.textContent = labelFor(point.date)

      const topValue = Math.max(
        ...series.map(item => {
          const current = valueOfPoint(point, item)
          return current ? current.value : 0
        }),
      )

      tooltip.replaceChildren(dateNode, ...rowNodes)
      tooltip.style.left = `${left}px`
      tooltip.style.top = `${Math.max(46, yAt(topValue) - 12)}px`
      tooltip.style.opacity = '1'
    }

    const hide = () => {
      cursor.setAttribute('opacity', '0')
      tooltip.style.opacity = '0'
    }

    // Propriedades (e não addEventListener): o gráfico é redesenhado no resize
    // e no toggle de séries, e listeners acumulados disparariam o tooltip
    // várias vezes para o mesmo movimento.
    container.onmousemove = event => {
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left - margin.left
      const ratio = innerWidth === 0 ? 0 : x / innerWidth
      const index = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))))
      showAt(index)
    }
    container.onmouseleave = hide
  }

  // Re-renderiza os gráficos quando a largura/altura útil muda (o recharts faz
  // o mesmo via ResponsiveContainer). Só reage a mudança real de medida.
  function observeResize(target, render) {
    let lastWidth = 0
    let lastHeight = 0
    let frame = null
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      if (Math.abs(rect.width - lastWidth) < 1 && Math.abs(rect.height - lastHeight) < 1) return
      lastWidth = rect.width
      lastHeight = rect.height
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = null
        render()
      })
    })
    observer.observe(target)
    return observer
  }

  window.PocCharts = {
    areaChart,
    monotoneLine,
    niceTicks,
    observeResize,
    formats: {
      integer: integerFormat,
      date: dateFormat,
    },
  }
})()
