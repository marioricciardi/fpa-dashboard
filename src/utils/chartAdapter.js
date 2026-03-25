// chartAdapter.js
//
// Converts the ToolResult.chart_data shape produced by OCI Functions into
// the dataset arrays that react-chartjs-2 consumes.
//
// ToolResult.chart_data shape:
//   { labels: string[], series: { key: number[] } }
//
// Output shape for react-chartjs-2:
//   { labels: string[], datasets: ChartDataset[] }

const PALETTE = {
  blue:   { solid: '#3266ad', alpha: 'rgba(50,102,173,0.18)',  border: '#3266ad' },
  teal:   { solid: '#1d9e75', alpha: 'rgba(29,158,117,0.20)',  border: '#1d9e75' },
  purple: { solid: '#7f77dd', alpha: 'rgba(127,119,221,0.18)', border: '#7f77dd' },
  amber:  { solid: '#ef9f27', alpha: 'rgba(239,159,39,0.22)',  border: '#ef9f27' },
  red:    { solid: '#e24b4a', alpha: 'rgba(226,75,74,0.22)',   border: '#e24b4a' },
  green:  { solid: '#639922', alpha: 'rgba(99,153,34,0.22)',   border: '#639922' },
  gray:   { solid: '#888780', alpha: 'rgba(136,135,128,0.18)', border: '#888780' },
}

// Ordered color assignment for multi-series charts
const COLOR_ORDER = ['blue', 'teal', 'purple', 'amber', 'red', 'green', 'gray']

/**
 * toBarData(chartData, options?)
 * For bar charts. series keys map to stacked or grouped datasets.
 * options.positiveNegativeColor = true → red for positive, green for negative (variance charts)
 */
export function toBarData(chartData, options = {}) {
  if (!chartData) return { labels: [], datasets: [] }
  const { labels, series } = chartData
  const keys = Object.keys(series)

  const datasets = keys.map((key, i) => {
    const color = PALETTE[COLOR_ORDER[i % COLOR_ORDER.length]]
    const data = series[key]

    if (options.positiveNegativeColor) {
      return {
        label: key,
        data,
        backgroundColor: data.map(v => (v > 0 ? PALETTE.red.alpha : PALETTE.green.alpha)),
        borderColor:     data.map(v => (v > 0 ? PALETTE.red.solid : PALETTE.green.solid)),
        borderWidth: 1.5,
        borderRadius: 3,
      }
    }

    return {
      label: key,
      data,
      backgroundColor: color.alpha,
      borderColor: color.solid,
      borderWidth: 1.5,
      borderRadius: 3,
    }
  })

  return { labels, datasets }
}

/**
 * toLineData(chartData, seriesConfig)
 * seriesConfig maps series key → { color, dash, fill, pointRadius }
 * Keys not in seriesConfig receive auto-assigned colors.
 */
export function toLineData(chartData, seriesConfig = {}) {
  if (!chartData) return { labels: [], datasets: [] }
  const { labels, series } = chartData
  const keys = Object.keys(series)

  const datasets = keys.map((key, i) => {
    const cfg = seriesConfig[key] || {}
    const color = cfg.color || PALETTE[COLOR_ORDER[i % COLOR_ORDER.length]].solid
    return {
      label: cfg.label || key,
      data: series[key],
      borderColor: color,
      borderWidth: cfg.borderWidth ?? 2,
      borderDash: cfg.dash || [],
      pointRadius: cfg.pointRadius ?? 2,
      pointBackgroundColor: color,
      fill: cfg.fill ?? false,
      backgroundColor: cfg.fillColor || 'transparent',
      tension: 0.35,
    }
  })

  return { labels, datasets }
}

/**
 * toDoughnutData(chartData)
 * Single-series only. Uses series.values or the first key.
 */
export function toDoughnutData(chartData) {
  if (!chartData) return { labels: [], datasets: [] }
  const { labels, series } = chartData
  const key = Object.keys(series)[0]
  return {
    labels,
    datasets: [{
      data: series[key],
      backgroundColor: COLOR_ORDER.map(k => PALETTE[k].solid),
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

/**
 * fmt(value, type)
 * Utility: format numbers for Chart.js tick callbacks and tooltip labels.
 * type: 'usd_k' | 'usd_m' | 'pct' | 'int'
 */
export function fmt(value, type = 'usd_k') {
  if (value == null) return ''
  switch (type) {
    case 'usd_k': return `$${Math.round(value / 1000)}K`
    case 'usd_m': return `$${(value / 1_000_000).toFixed(1)}M`
    case 'pct':   return `${value.toFixed(1)}%`
    case 'int':   return String(Math.round(value))
    default:      return String(value)
  }
}
