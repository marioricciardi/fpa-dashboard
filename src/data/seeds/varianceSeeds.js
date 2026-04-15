// varianceSeeds.js — Variance seed constants by fiscal year (23–26)
// Pure data — no logic. Consumed by ../variance.js

// Budget-vs-actual driver rows (full-year amounts before period scaling)
export const YEARLY_BUDGET = {
  23: [
    { account: '5110', subsidiary: '000', account_desc: 'Salaries & Benefits', bu_name: 'Engineering', business_unit: 'ENG',   budget: 1800000, actual: 1920000 },
    { account: '6210', subsidiary: '000', account_desc: 'Marketing Programs',  bu_name: 'Marketing',   business_unit: 'MKTG',  budget:  720000, actual:  810000 },
    { account: '7420', subsidiary: '000', account_desc: 'Cloud Infrastructure',bu_name: 'IT',          business_unit: 'IT',    budget: 1100000, actual: 1180000 },
    { account: '7410', subsidiary: '000', account_desc: 'Software Licenses',   bu_name: 'IT',          business_unit: 'IT',    budget:  480000, actual:  505000 },
    { account: '5210', subsidiary: '000', account_desc: 'R&D Personnel',       bu_name: 'R&D',         business_unit: 'RD',    budget: 1600000, actual: 1540000 },
    { account: '6110', subsidiary: '000', account_desc: 'Sales Commissions',   bu_name: 'Sales',       business_unit: 'SALES', budget: 1500000, actual: 1380000 },
    { account: '5310', subsidiary: '000', account_desc: 'Operations',          bu_name: 'Operations',  business_unit: 'OPS',   budget: 1200000, actual: 1140000 },
    { account: '8110', subsidiary: '000', account_desc: 'Finance Overhead',    bu_name: 'Finance',     business_unit: 'FIN',   budget:  500000, actual:  518000 },
  ],
  24: [
    { account: '5110', subsidiary: '000', account_desc: 'Salaries & Benefits', bu_name: 'Engineering', business_unit: 'ENG',   budget: 1950000, actual: 2100000 },
    { account: '6210', subsidiary: '000', account_desc: 'Marketing Programs',  bu_name: 'Marketing',   business_unit: 'MKTG',  budget:  820000, actual:  960000 },
    { account: '7420', subsidiary: '000', account_desc: 'Cloud Infrastructure',bu_name: 'IT',          business_unit: 'IT',    budget: 1250000, actual: 1380000 },
    { account: '7410', subsidiary: '000', account_desc: 'Software Licenses',   bu_name: 'IT',          business_unit: 'IT',    budget:  530000, actual:  570000 },
    { account: '5210', subsidiary: '000', account_desc: 'R&D Personnel',       bu_name: 'R&D',         business_unit: 'RD',    budget: 1900000, actual: 1830000 },
    { account: '6110', subsidiary: '000', account_desc: 'Sales Commissions',   bu_name: 'Sales',       business_unit: 'SALES', budget: 1680000, actual: 1520000 },
    { account: '5310', subsidiary: '000', account_desc: 'Operations',          bu_name: 'Operations',  business_unit: 'OPS',   budget: 1300000, actual: 1220000 },
    { account: '8110', subsidiary: '000', account_desc: 'Finance Overhead',    bu_name: 'Finance',     business_unit: 'FIN',   budget:  550000, actual:  572000 },
  ],
  25: [
    { account: '5110', subsidiary: '000', account_desc: 'Salaries & Benefits', bu_name: 'Engineering', business_unit: 'ENG',   budget: 2100000, actual: 2290000 },
    { account: '6210', subsidiary: '000', account_desc: 'Marketing Programs',  bu_name: 'Marketing',   business_unit: 'MKTG',  budget:  900000, actual: 1098000 },
    { account: '7420', subsidiary: '000', account_desc: 'Cloud Infrastructure',bu_name: 'IT',          business_unit: 'IT',    budget: 1400000, actual: 1545000 },
    { account: '7410', subsidiary: '000', account_desc: 'Software Licenses',   bu_name: 'IT',          business_unit: 'IT',    budget:  580000, actual:  625000 },
    { account: '5210', subsidiary: '000', account_desc: 'R&D Personnel',       bu_name: 'R&D',         business_unit: 'RD',    budget: 2200000, actual: 2111000 },
    { account: '6110', subsidiary: '000', account_desc: 'Sales Commissions',   bu_name: 'Sales',       business_unit: 'SALES', budget: 1800000, actual: 1600000 },
    { account: '5310', subsidiary: '000', account_desc: 'Operations',          bu_name: 'Operations',  business_unit: 'OPS',   budget: 1400000, actual: 1302000 },
    { account: '8110', subsidiary: '000', account_desc: 'Finance Overhead',    bu_name: 'Finance',     business_unit: 'FIN',   budget:  600000, actual:  618000 },
  ],
  26: [
    { account: '5110', subsidiary: '000', account_desc: 'Salaries & Benefits', bu_name: 'Engineering', business_unit: 'ENG',   budget: 2280000, actual: 2410000 },
    { account: '6210', subsidiary: '000', account_desc: 'Marketing Programs',  bu_name: 'Marketing',   business_unit: 'MKTG',  budget:  980000, actual: 1140000 },
    { account: '7420', subsidiary: '000', account_desc: 'Cloud Infrastructure',bu_name: 'IT',          business_unit: 'IT',    budget: 1520000, actual: 1650000 },
    { account: '7410', subsidiary: '000', account_desc: 'Software Licenses',   bu_name: 'IT',          business_unit: 'IT',    budget:  620000, actual:  660000 },
    { account: '5210', subsidiary: '000', account_desc: 'R&D Personnel',       bu_name: 'R&D',         business_unit: 'RD',    budget: 2350000, actual: 2280000 },
    { account: '6110', subsidiary: '000', account_desc: 'Sales Commissions',   bu_name: 'Sales',       business_unit: 'SALES', budget: 1950000, actual: 1780000 },
    { account: '5310', subsidiary: '000', account_desc: 'Operations',          bu_name: 'Operations',  business_unit: 'OPS',   budget: 1500000, actual: 1410000 },
    { account: '8110', subsidiary: '000', account_desc: 'Finance Overhead',    bu_name: 'Finance',     business_unit: 'FIN',   budget:  640000, actual:  655000 },
  ],
}

// PnL-level totals for period comparison (aligned with pnlSeeds)
export const YEARLY_PNL = {
  23: { revenue: 28500000, opex: 17920000, net_income:  8500000, gm_pct: 57.5 },
  24: { revenue: 32800000, opex: 19360000, net_income: 11305000, gm_pct: 59.2 },
  25: { revenue: 36200000, opex: 20890000, net_income: 14210000, gm_pct: 60.8 },
  26: { revenue: 39800000, opex: 22350000, net_income: 15900000, gm_pct: 61.5 },
}
