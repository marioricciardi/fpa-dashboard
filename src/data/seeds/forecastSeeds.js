// forecastSeeds.js — Forecast seed constants by fiscal year (23–26)
// Pure data — no logic. Consumed by ../forecast.js

// Monthly revenue seasonality (same as pnlSeeds for cross-tool consistency)
export const SEASON = [
  0.070, 0.075, 0.080, 0.085, 0.090, 0.085,
  0.080, 0.085, 0.090, 0.085, 0.085, 0.090,
]

// AP spend per quarter (Holt-Winters model output)
export const AP_QUARTERLY = {
  23: { base: 2200, growth: 0.04, r2: 0.72, alpha: 0.25, beta: 0.08, gamma: 0.18 },
  24: { base: 2500, growth: 0.05, r2: 0.74, alpha: 0.28, beta: 0.09, gamma: 0.20 },
  25: { base: 2890, growth: 0.06, r2: 0.68, alpha: 0.30, beta: 0.10, gamma: 0.22 },
  26: { base: 3200, growth: 0.05, r2: 0.78, alpha: 0.32, beta: 0.11, gamma: 0.20 },
}

// Full-year expense breakdown
export const EXPENSE_YEARLY = {
  23: { cogs: 12100000, sga: 4200000, rd: 1600000, da: 780000, other: 240000, budget_mult: 0.97 },
  24: { cogs: 13400000, sga: 4500000, rd: 1900000, da: 840000, other: 280000, budget_mult: 0.98 },
  25: { cogs: 14200000, sga: 4800000, rd: 2100000, da: 890000, other: 340000, budget_mult: 0.99 },
  26: { cogs: 15300000, sga: 5100000, rd: 2300000, da: 950000, other: 380000, budget_mult: 1.01 },
}

// Rolling forecast parameters
export const ROLLING_YEARLY = {
  23: { fullYear: 27800000, budget: 27200000, mape: 5.1, currentPeriod: 12 },
  24: { fullYear: 32400000, budget: 31800000, mape: 4.6, currentPeriod: 12 },
  25: { fullYear: 35900000, budget: 35200000, mape: 4.2, currentPeriod:  6 },
  26: { fullYear: 39500000, budget: 38800000, mape: 3.8, currentPeriod:  6 },
}

// Deterministic noise multipliers for actuals (one per period, avoids Math.random)
export const ACTUAL_NOISE = [1.005, 0.98, 1.01, 0.995, 1.02, 0.99, 1.005, 1.01, 0.985, 1.015, 0.995, 1.008]
