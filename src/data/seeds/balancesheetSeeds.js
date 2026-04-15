// balancesheetSeeds.js — Balance Sheet seed constants by fiscal year (23–26)
// Pure data — no logic. Consumed by ../balancesheet.js

export const YEARLY_BS = {
  23: {
    ca:  { cash:  9800000, ar: 5200000, inventory: 2600000, prepaid: 380000 },
    nca: { ppe:   7200000, intangibles: 1800000, other: 620000 },
    cl:  { ap:    3400000, accrued: 1500000, deferred:  720000 },
    ncl: { lt_debt: 4800000, deferred_tax: 580000 },
    eq:  { common: 5000000, retained: 11600000 },
  },
  24: {
    ca:  { cash: 11200000, ar: 6100000, inventory: 2900000, prepaid: 420000 },
    nca: { ppe:   8100000, intangibles: 1950000, other: 700000 },
    cl:  { ap:    3800000, accrued: 1650000, deferred:  810000 },
    ncl: { lt_debt: 5000000, deferred_tax: 630000 },
    eq:  { common: 5000000, retained: 14280000 },
  },
  25: {
    ca:  { cash: 12400000, ar: 6800000, inventory: 3200000, prepaid: 450000 },
    nca: { ppe:   8900000, intangibles: 2100000, other: 780000 },
    cl:  { ap:    4200000, accrued: 1800000, deferred:  920000 },
    ncl: { lt_debt: 5200000, deferred_tax: 680000 },
    eq:  { common: 5000000, retained: 16830000 },
  },
  26: {
    ca:  { cash: 13800000, ar: 7400000, inventory: 3500000, prepaid: 490000 },
    nca: { ppe:   9600000, intangibles: 2250000, other: 850000 },
    cl:  { ap:    4500000, accrued: 1950000, deferred:  980000 },
    ncl: { lt_debt: 5400000, deferred_tax: 720000 },
    eq:  { common: 5000000, retained: 19190000 },
  },
}

// Chart-of-accounts mapping for generated account-level rows
export const COA = {
  ca: [
    { obj: '1010', sub: '000', desc: 'Cash & Equivalents',      bu: 'CORP', field: 'cash' },
    { obj: '1210', sub: '000', desc: 'Accounts Receivable',     bu: 'CORP', field: 'ar' },
    { obj: '1310', sub: '000', desc: 'Inventory - Raw Material', bu: 'MFG',  field: 'inventory', share: 0.45 },
    { obj: '1320', sub: '000', desc: 'Inventory - WIP',          bu: 'MFG',  field: 'inventory', share: 0.20 },
    { obj: '1330', sub: '000', desc: 'Inventory - Finished Goods',bu:'MFG',  field: 'inventory', share: 0.35 },
    { obj: '1410', sub: '000', desc: 'Prepaid Expenses',         bu: 'CORP', field: 'prepaid' },
  ],
  nca: [
    { obj: '1510', sub: '000', desc: 'Property, Plant & Equipment', bu: 'CORP', field: 'ppe' },
    { obj: '1610', sub: '000', desc: 'Intangible Assets',           bu: 'CORP', field: 'intangibles' },
    { obj: '1710', sub: '000', desc: 'Other Long-Term Assets',      bu: 'CORP', field: 'other' },
  ],
  cl: [
    { obj: '2010', sub: '000', desc: 'Accounts Payable',    bu: 'CORP', field: 'ap' },
    { obj: '2110', sub: '000', desc: 'Accrued Liabilities',  bu: 'CORP', field: 'accrued' },
    { obj: '2210', sub: '000', desc: 'Deferred Revenue',     bu: 'CORP', field: 'deferred' },
  ],
  ncl: [
    { obj: '2510', sub: '000', desc: 'Long-Term Debt',        bu: 'CORP', field: 'lt_debt' },
    { obj: '2610', sub: '000', desc: 'Deferred Tax Liability', bu: 'CORP', field: 'deferred_tax' },
  ],
  eq: [
    { obj: '3010', sub: '000', desc: 'Common Stock',      bu: 'CORP', field: 'common' },
    { obj: '3110', sub: '000', desc: 'Retained Earnings',  bu: 'CORP', field: 'retained' },
  ],
}
