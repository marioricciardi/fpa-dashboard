// SimulationContext — Monte Carlo simulation engine + React Context
// Architecture: SimulationProvider wraps the app root. Every tab/chart/KPI chip reads from it.
// Client-side 2,000-iteration Monte Carlo for demo. In production: delegate to OCI Functions.

import { useState, useReducer, useCallback, createContext, useContext } from 'react'

// Simulation accent palette
const SIM_PALETTE = ['#F59E0B', '#8B5CF6', '#10B981', '#EC4899']

const ACTUALS = {
  revenue: -184.59, cogs: 0, gp: -184.59, sga: 0,
  ebitda: -184.59, ebit: -184.59, da: 0,
  totalAssets: 8200, totalLiabs: 525, workCap: 7675,
  fcf: null, capex: null, dso: null, ccc: null,
}

const PERIOD_LABELS = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12']

// ── Simulation Templates ──
export const SIM_TEMPLATES = [
  {
    id: 'hiring_freeze', label: 'Hiring Freeze',
    description: 'Freeze all new hires. Models salary savings from attrition, capacity-driven revenue impact, and overtime costs.',
    icon: '👥', affectedKPIs: ['sga','ebitda','ebit','revenue'],
    parameters: [
      { key: 'duration_months', label: 'Duration', type: 'slider', min: 1, max: 24, default: 12, unit: 'months', step: 1 },
      { key: 'attrition_rate', label: 'Annual Attrition', type: 'slider', min: 3, max: 25, default: 12, unit: '%', step: 1 },
      { key: 'avg_salary_k', label: 'Avg Salary', type: 'slider', min: 40, max: 200, default: 85, unit: '$K/yr', step: 5 },
      { key: 'overtime_factor', label: 'Overtime Multiplier', type: 'slider', min: 1, max: 1.5, default: 1.15, unit: '×', step: 0.05 },
    ],
    computeImpact(p) {
      const headcountLost = (p.attrition_rate / 100) * (p.duration_months / 12)
      const salSave = headcountLost * p.avg_salary_k * 1000
      const otCost = salSave * (p.overtime_factor - 1) * 0.4
      const revImpact = -salSave * 0.06
      const sgaDelta = -(salSave - otCost)
      const ebitdaDelta = -sgaDelta + revImpact
      return {
        sga: { mean: sgaDelta, uncertaintyPct: 0.22 },
        ebitda: { mean: ebitdaDelta, uncertaintyPct: 0.28 },
        ebit: { mean: ebitdaDelta, uncertaintyPct: 0.28 },
        revenue: { mean: revImpact, uncertaintyPct: 0.40 },
      }
    },
  },
  {
    id: 'revenue_shock', label: 'Revenue Shock',
    description: 'Apply a percentage change to top-line revenue. Models cascading impact on gross profit, EBITDA, and cash flow.',
    icon: '📈', affectedKPIs: ['revenue','gp','ebitda','ebit'],
    parameters: [
      { key: 'rev_change_pct', label: 'Revenue Change', type: 'slider', min: -30, max: 30, default: 10, unit: '%', step: 1 },
      { key: 'gm_pct', label: 'Gross Margin %', type: 'slider', min: 20, max: 90, default: 45, unit: '%', step: 1 },
      { key: 'sga_fixed_pct', label: 'SG&A Fixed %', type: 'slider', min: 30, max: 90, default: 60, unit: '% fixed', step: 5 },
    ],
    computeImpact(p) {
      const revBaseline = 5769
      const revDelta = revBaseline * (p.rev_change_pct / 100)
      const gpDelta = revDelta * (p.gm_pct / 100)
      const ebitdaDelta = gpDelta * (p.sga_fixed_pct / 100)
      return {
        revenue: { mean: revDelta, uncertaintyPct: 0.18 },
        gp: { mean: gpDelta, uncertaintyPct: 0.20 },
        ebitda: { mean: ebitdaDelta, uncertaintyPct: 0.25 },
        ebit: { mean: ebitdaDelta, uncertaintyPct: 0.25 },
      }
    },
  },
  {
    id: 'cost_inflation', label: 'Cost Inflation',
    description: 'Model COGS and SG&A inflation. Separates fixed vs variable cost sensitivity and gross margin compression.',
    icon: '💸', affectedKPIs: ['cogs','sga','ebitda','ebit','gp'],
    parameters: [
      { key: 'cogs_inflation', label: 'COGS Inflation', type: 'slider', min: 0, max: 20, default: 5, unit: '%', step: 0.5 },
      { key: 'sga_inflation', label: 'SG&A Inflation', type: 'slider', min: 0, max: 15, default: 3, unit: '%', step: 0.5 },
      { key: 'cogs_base_k', label: 'COGS Baseline', type: 'slider', min: 500, max: 5000, default: 2200, unit: '$K', step: 100 },
      { key: 'sga_base_k', label: 'SG&A Baseline', type: 'slider', min: 100, max: 2000, default: 850, unit: '$K', step: 50 },
    ],
    computeImpact(p) {
      const cogsDelta = -(p.cogs_base_k * 1000) * (p.cogs_inflation / 100)
      const sgaDelta = -(p.sga_base_k * 1000) * (p.sga_inflation / 100)
      const ebitdaDelta = cogsDelta + sgaDelta
      return {
        cogs: { mean: cogsDelta, uncertaintyPct: 0.15 },
        sga: { mean: sgaDelta, uncertaintyPct: 0.18 },
        gp: { mean: cogsDelta, uncertaintyPct: 0.15 },
        ebitda: { mean: ebitdaDelta, uncertaintyPct: 0.22 },
        ebit: { mean: ebitdaDelta, uncertaintyPct: 0.22 },
      }
    },
  },
  {
    id: 'capex_defer', label: 'CapEx Deferral',
    description: 'Defer capital expenditures by N months. Models FCF improvement, depreciation timing, and reinvestment opportunity cost.',
    icon: '🏗️', affectedKPIs: ['fcf','capex','ebitda'],
    parameters: [
      { key: 'capex_amount_k', label: 'CapEx Amount', type: 'slider', min: 100, max: 5000, default: 800, unit: '$K', step: 100 },
      { key: 'defer_months', label: 'Deferral Period', type: 'slider', min: 1, max: 18, default: 6, unit: 'months', step: 1 },
      { key: 'wacc_pct', label: 'WACC', type: 'slider', min: 5, max: 20, default: 10, unit: '%', step: 0.5 },
    ],
    computeImpact(p) {
      const capexSave = p.capex_amount_k * 1000 * (p.defer_months / 12)
      const oppCost = capexSave * (p.wacc_pct / 100) * (p.defer_months / 12)
      return {
        capex: { mean: capexSave, uncertaintyPct: 0.10 },
        fcf: { mean: capexSave - oppCost, uncertaintyPct: 0.15 },
        ebitda: { mean: 0, uncertaintyPct: 0.05 },
      }
    },
  },
  {
    id: 'rate_change', label: 'Interest Rate Change',
    description: 'Model impact of a central bank rate move on floating-rate debt service, investment income, and EBITDA bridge.',
    icon: '🏦', affectedKPIs: ['ebitda','ebit','fcf'],
    parameters: [
      { key: 'rate_delta_bps', label: 'Rate Change', type: 'slider', min: -200, max: 200, default: 75, unit: 'bps', step: 25 },
      { key: 'debt_balance_k', label: 'Floating Debt', type: 'slider', min: 0, max: 10000, default: 1200, unit: '$K', step: 100 },
      { key: 'inv_balance_k', label: 'Cash/Investments', type: 'slider', min: 0, max: 5000, default: 500, unit: '$K', step: 100 },
    ],
    computeImpact(p) {
      const rateChg = p.rate_delta_bps / 10000
      const intExpDelta = -(p.debt_balance_k * 1000) * rateChg
      const invIncome = (p.inv_balance_k * 1000) * rateChg
      const netImpact = intExpDelta + invIncome
      return {
        ebitda: { mean: netImpact, uncertaintyPct: 0.12 },
        ebit: { mean: netImpact, uncertaintyPct: 0.12 },
        fcf: { mean: netImpact, uncertaintyPct: 0.15 },
      }
    },
  },
]

// ── Monte Carlo Engine ──
function randn() {
  const u = Math.max(Math.random(), 1e-10)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random())
}

function percentile(arr, p) { return arr[Math.floor(arr.length * p)] }

function runMonteCarlo(def, N = 2000) {
  const tpl = SIM_TEMPLATES.find(t => t.id === def.templateId)
  if (!tpl) return null
  const impacts = tpl.computeImpact(def.parameters)

  const kpiImpacts = {}
  const histogramData = {}
  for (const [kpiKey, imp] of Object.entries(impacts)) {
    const base = ACTUALS[kpiKey] ?? 0
    const runs = Array.from({ length: N }, () =>
      base + imp.mean + imp.mean * imp.uncertaintyPct * randn()
    ).sort((a, b) => a - b)
    const p50 = percentile(runs, 0.5)
    kpiImpacts[kpiKey] = {
      p10: percentile(runs, 0.1), p25: percentile(runs, 0.25),
      p50, p75: percentile(runs, 0.75), p90: percentile(runs, 0.9),
      mean: runs.reduce((a, b) => a + b, 0) / N,
      stdDev: Math.sqrt(runs.reduce((a, b) => a + (b - (base + imp.mean)) ** 2, 0) / N),
      actualBaseline: base,
      delta_p50: p50 - base,
      delta_pct: base !== 0 ? (p50 - base) / Math.abs(base) * 100 : null,
    }
    const mn = percentile(runs, 0.01), mx = percentile(runs, 0.99)
    const bw = (mx - mn) / 20 || 1
    const bins = Array.from({ length: 20 }, (_, i) => ({ bin: mn + (i + 0.5) * bw, count: 0 }))
    runs.forEach(v => { const i = Math.min(19, Math.floor((v - mn) / bw)); bins[i].count++ })
    histogramData[kpiKey] = bins
  }

  const periodSeries = {}
  for (const [kpiKey, imp] of Object.entries(impacts)) {
    const base = ACTUALS[kpiKey] ?? 0
    periodSeries[kpiKey] = PERIOD_LABELS.map((period, pi) => {
      const ramp = (pi + 1) / 12
      const tUnc = imp.uncertaintyPct * Math.sqrt(ramp + 0.2)
      const pImpact = imp.mean * ramp
      const pRuns = Array.from({ length: 400 }, () =>
        base + pImpact + pImpact * tUnc * randn()
      ).sort((a, b) => a - b)
      return {
        period,
        actual: pi < 6 ? (base + (pi === 5 ? imp.mean * 0.1 : 0)) : null,
        sim_p10: percentile(pRuns, 0.1), sim_p25: percentile(pRuns, 0.25),
        sim_p50: percentile(pRuns, 0.5), sim_p75: percentile(pRuns, 0.75),
        sim_p90: percentile(pRuns, 0.9),
      }
    })
  }

  const eImp = impacts.ebitda || impacts.ebit || Object.values(impacts)[0]
  const base = ACTUALS.ebitda ?? 0
  let runSum = 0
  const convergenceData = Array.from({ length: 20 }, (_, i) => {
    const blockSize = N / 20
    for (let j = 0; j < blockSize; j++) runSum += base + eImp.mean + eImp.mean * eImp.uncertaintyPct * randn()
    return { iteration: (i + 1) * blockSize, mean: runSum / ((i + 1) * blockSize) }
  })

  const sensitivityData = (def.parameters && typeof def.parameters === 'object' && !Array.isArray(def.parameters))
    ? tpl.parameters.map(param => {
        const pLow = { ...def.parameters, [param.key]: (def.parameters[param.key] ?? param.default) * 0.8 }
        const pHigh = { ...def.parameters, [param.key]: (def.parameters[param.key] ?? param.default) * 1.2 }
        const iLow = tpl.computeImpact(pLow).ebitda || tpl.computeImpact(pLow)[Object.keys(impacts)[0]]
        const iHigh = tpl.computeImpact(pHigh).ebitda || tpl.computeImpact(pHigh)[Object.keys(impacts)[0]]
        return {
          param: param.label,
          low: (iLow?.mean || 0) - (eImp?.mean || 0),
          high: (iHigh?.mean || 0) - (eImp?.mean || 0),
          range: Math.abs((iHigh?.mean || 0) - (iLow?.mean || 0)),
        }
      }).sort((a, b) => b.range - a.range)
    : []

  return { runs: N, converged: true, kpiImpacts, periodSeries, convergenceData, histogramData, sensitivityData }
}

// ── Context + Reducer ──
const SimulationContext = createContext(null)

function simReducer(state, action) {
  switch (action.type) {
    case 'ADD': return { ...state, simulations: [...state.simulations, action.sim] }
    case 'REMOVE': return { ...state, simulations: state.simulations.filter(s => s.id !== action.id) }
    case 'TOGGLE': return { ...state, simulations: state.simulations.map(s => s.id === action.id ? { ...s, active: !s.active } : s) }
    case 'CLEAR': return { ...state, simulations: [] }
    case 'MODE': return { ...state, compoundMode: action.mode }
    default: return state
  }
}

export function SimulationProvider({ children }) {
  const [state, dispatch] = useReducer(simReducer, { simulations: [], compoundMode: 'independent' })

  const addSimulation = useCallback((def) => {
    const sim = {
      ...def,
      id: `sim-${Date.now()}`,
      color: SIM_PALETTE[state.simulations.length % SIM_PALETTE.length],
      active: true,
      createdAt: new Date().toISOString(),
      results: runMonteCarlo(def),
    }
    dispatch({ type: 'ADD', sim })
    return sim
  }, [state.simulations.length])

  const ctx = {
    simulations: state.simulations,
    activeSimulations: state.simulations.filter(s => s.active),
    isAnyActive: state.simulations.some(s => s.active),
    compoundMode: state.compoundMode,
    addSimulation,
    removeSimulation: id => dispatch({ type: 'REMOVE', id }),
    toggleSimulation: id => dispatch({ type: 'TOGGLE', id }),
    clearAll: () => dispatch({ type: 'CLEAR' }),
    setCompoundMode: m => dispatch({ type: 'MODE', mode: m }),
    getKPIImpact: (kpiKey) => {
      const relevant = state.simulations.filter(s => s.active && s.affectedKPIs?.includes(kpiKey))
      if (!relevant.length) return null
      if (state.compoundMode === 'compound') {
        const compound = relevant.reduce((acc, sim) => {
          const r = sim.results?.kpiImpacts?.[kpiKey]
          if (!r) return acc
          return { ...acc, delta_p50: acc.delta_p50 + r.delta_p50, p10: acc.p10 + r.p10, p90: acc.p90 + r.p90 }
        }, { delta_p50: 0, p10: 0, p90: 0 })
        return { ...compound, sims: relevant }
      }
      const first = relevant[0].results?.kpiImpacts?.[kpiKey]
      return first ? { ...first, sims: relevant } : null
    },
  }

  return <SimulationContext.Provider value={ctx}>{children}</SimulationContext.Provider>
}

export function useSimulation() { return useContext(SimulationContext) }

// ── Augment data with simulation overlays ──
export function augmentPeriodData(baseData, rowKey, kpiKey, activeSims) {
  const relevant = activeSims.filter(s => s.affectedKPIs?.includes(kpiKey))
  if (!relevant.length) return { data: baseData, relevant }
  const data = baseData.map((row, pi) => {
    const out = { ...row }
    relevant.forEach((sim, si) => {
      const ps = sim.results?.periodSeries?.[kpiKey]?.[pi]
      if (ps) {
        out[`s${si}_p50`] = ps.sim_p50
        out[`s${si}_p10`] = ps.sim_p10
        out[`s${si}_p90`] = ps.sim_p90
      }
    })
    return out
  })
  return { data, relevant }
}

// ── Sim intent detection for chat ──
const SIM_TRIGGERS = [
  { keywords: ['freeze','hiring','headcount','layoff','staffing','attrition'], templateId: 'hiring_freeze' },
  { keywords: ['revenue','sales','price','growth','decline','shock','increase','decrease'], templateId: 'revenue_shock' },
  { keywords: ['cost','inflation','cogs','expense','overhead','operating cost'], templateId: 'cost_inflation' },
  { keywords: ['capex','capital','investment','defer','delay','spend'], templateId: 'capex_defer' },
  { keywords: ['rate','interest','basis points','bps','fed','central bank'], templateId: 'rate_change' },
]

export function detectSimIntent(message) {
  const lower = message.toLowerCase()
  const isSimPhrase = /what (would|if|happens? if)|simulate|scenario|model|impact of|effect of|what about|suppose/i.test(lower)
  if (!isSimPhrase) return null
  for (const trigger of SIM_TRIGGERS) {
    if (trigger.keywords.some(kw => lower.includes(kw))) {
      const tpl = SIM_TEMPLATES.find(t => t.id === trigger.templateId)
      const numMatch = lower.match(/(\d+)\s*(month|year|mo|yr)/)
      const durationRaw = numMatch ? parseInt(numMatch[1]) * (numMatch[2].startsWith('y') ? 12 : 1) : null
      const pctMatch = lower.match(/(\d+)\s*%/)
      const pctVal = pctMatch ? parseInt(pctMatch[1]) : null
      const params = Object.fromEntries(tpl.parameters.map(p => {
        if (p.key === 'duration_months' && durationRaw) return [p.key, Math.min(durationRaw, p.max)]
        if ((p.key === 'rev_change_pct' || p.key === 'cogs_inflation' || p.key === 'sga_inflation') && pctVal) return [p.key, Math.min(pctVal, p.max)]
        return [p.key, p.default]
      }))
      return { templateId: trigger.templateId, params, tpl }
    }
  }
  return null
}
