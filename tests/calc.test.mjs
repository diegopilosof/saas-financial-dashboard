/* Unit tests for the dashboard's pure math + formatters.
 * Run: node tests/calc.test.mjs       (Node)
 *      jsc tests/calc.test.mjs        (JavaScriptCore)
 *
 * These functions are copy-pasted from dashboard.html so the tests can run
 * outside the browser. If the dashboard's logic changes, mirror it here.
 */

// Cross-runtime polyfill: JSC doesn't have `console`, only `print()`.
if (typeof console === 'undefined') {
  const out = (...args) => print(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  globalThis.console = { log: out, error: out, warn: out };
}

/* ----------- formatters (mirror of dashboard.html) ----------- */
const formatCurrency = (val) => {
  if (val === null || val === undefined || Number.isNaN(val)) return '–';
  if (!Number.isFinite(val)) return '∞';
  const v = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (v >= 1e9) return sign + '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return sign + '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return sign + '$' + (v / 1e3).toFixed(0) + 'K';
  return sign + '$' + Math.round(v);
};
const formatPercent = (val) => Number.isFinite(val) ? val.toFixed(1) + '%' : '–';
const formatMonths = (val) => {
  if (!Number.isFinite(val)) return '∞';
  if (val > 240) return '20+ yrs';
  return val.toFixed(1) + ' mo';
};
const formatNumber = (val, dp) => Number.isFinite(val) ? val.toFixed(dp == null ? 2 : dp) : '–';

/* ----------- KPI calc (mirror) ----------- */
function computeKpis(mrr, momGrowth, expansionRate, churn, cac, grossMargin, burn, cash, arpa) {
  const arr = mrr * 12;
  const gmDec = grossMargin / 100;
  const churnDec = churn / 100;
  const ltv = churnDec > 0 ? (arpa * gmDec) / churnDec : Infinity;
  const ltvCac = cac > 0 ? ltv / cac : Infinity;
  const grossProfitPerCust = arpa * gmDec;
  const cacPayback = grossProfitPerCust > 0 ? cac / grossProfitPerCust : Infinity;
  const runway = burn > 0 ? cash / burn : Infinity;
  const nrr = 100 + expansionRate - churn;
  const sm = burn * 0.4;
  const magic = sm > 0 ? (mrr * (momGrowth / 100) * 12) / sm : 0;
  return { arr, ltv, ltvCac, cacPayback, runway, nrr, magic, grossProfitPerCust };
}

/* ----------- series (mirror) ----------- */
function computeMrrSeries(mrr, momGrowth, horizon) {
  const base = momGrowth / 100, opt = base * 1.2, pess = base * 0.7;
  const out = [];
  for (let i = 0; i <= horizon; i++) {
    out.push({
      month: i,
      base: mrr * Math.pow(1 + base, i),
      optimistic: mrr * Math.pow(1 + opt, i),
      pessimistic: mrr * Math.pow(1 + pess, i),
    });
  }
  return out;
}
function computeCashSeries(mrr, burn, cash, momGrowth, horizon) {
  const opex = mrr + burn;
  const base = momGrowth / 100;
  const dangerThreshold = burn * 3;
  let c = cash, zeroAt = null;
  const rows = [{ month: 0, cash: c, danger: null }];
  for (let i = 1; i <= horizon; i++) {
    const projMrr = mrr * Math.pow(1 + base, i);
    const netBurn = opex - projMrr;
    c = c - netBurn;
    const inDanger = c > 0 && c < dangerThreshold;
    if (zeroAt === null && c <= 0) zeroAt = i;
    rows.push({ month: i, cash: Math.max(c, 0), danger: inDanger ? Math.max(c, 0) : null });
  }
  return { rows, zeroAt };
}
function computeRetentionSeries(churn) {
  const yourChurn = churn / 100;
  const benchChurn = 0.004;
  const out = [];
  for (let i = 0; i < 13; i++) {
    const yours = Math.pow(1 - yourChurn, i) * 100;
    const bench = Math.pow(1 - benchChurn, i) * 100;
    out.push({ month: i, yours, benchmark: bench, gap: Math.max(0, bench - yours) });
  }
  return out;
}
function computeChartInsights(mrr, momGrowth, burn, cashSeries, retentionSeries) {
  const g = momGrowth / 100;
  const opex = mrr + burn;
  const currentARR = mrr * 12;
  const mrrAt = (t) => mrr * Math.pow(1 + g, t);
  const monthsToARR = (target) => {
    if (currentARR >= target) return 0;
    if (g <= 0 || mrr <= 0) return null;
    return Math.ceil(Math.log((target / 12) / mrr) / Math.log(1 + g));
  };
  const breakEven = (g <= 0 || mrr <= 0) ? null
    : Math.ceil(Math.log(opex / mrr) / Math.log(1 + g));
  const dangerRow = cashSeries.rows.find(r => r.danger !== null);
  const r12 = retentionSeries[12];
  return {
    mrrMonth12: mrrAt(12),
    mrrMonth24: mrrAt(24),
    mrrMonth36: mrrAt(36),
    monthsTo1MARR: monthsToARR(1_000_000),
    monthsTo10MARR: monthsToARR(10_000_000),
    breakEvenMonth: breakEven,
    firstDangerMonth: dangerRow ? dangerRow.month : null,
    zeroCashMonth: cashSeries.zeroAt,
    retentionAt12: r12 ? r12.yours : null,
    benchmarkAt12: r12 ? r12.benchmark : null,
  };
}

/* ----------- mini test framework ----------- */
let pass = 0, fail = 0;
const failures = [];
const eq = (actual, expected, name) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; failures.push({ name, expected, actual }); }
};
const close = (actual, expected, eps, name) => {
  const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= eps;
  if (ok) { pass++; }
  else { fail++; failures.push({ name, expected: '≈' + expected + ' ±' + eps, actual }); }
};
const truthy = (cond, name) => {
  if (cond) { pass++; } else { fail++; failures.push({ name, expected: 'truthy', actual: cond }); }
};
const section = (name) => console.log('\n— ' + name + ' —');

/* ============================ TESTS ============================ */

section('formatCurrency');
eq(formatCurrency(45000), '$45K', '45000 → $45K');
eq(formatCurrency(540_000), '$540K', '540K');
eq(formatCurrency(1_200_000), '$1.20M', '1.2M');
eq(formatCurrency(45_000_000), '$45.00M', '45M');
eq(formatCurrency(1_500_000_000), '$1.5B', '1.5B');
eq(formatCurrency(0), '$0', 'zero');
eq(formatCurrency(999), '$999', 'just under 1K');
eq(formatCurrency(1000), '$1K', 'exactly 1K');
eq(formatCurrency(-500), '-$500', 'negative small');
eq(formatCurrency(-1_500_000), '-$1.50M', 'negative millions');
eq(formatCurrency(Infinity), '∞', 'Infinity');
eq(formatCurrency(-Infinity), '∞', '-Infinity');
eq(formatCurrency(NaN), '–', 'NaN');
eq(formatCurrency(null), '–', 'null');
eq(formatCurrency(undefined), '–', 'undefined');

section('formatPercent');
eq(formatPercent(0), '0.0%', '0');
eq(formatPercent(2.5), '2.5%', '2.5');
eq(formatPercent(101), '101.0%', '101');
eq(formatPercent(Infinity), '–', 'Infinity returns dash');
eq(formatPercent(NaN), '–', 'NaN returns dash');

section('formatMonths');
eq(formatMonths(14.12), '14.1 mo', '14.12 → 14.1 mo');
eq(formatMonths(0.5), '0.5 mo', '0.5');
eq(formatMonths(241), '20+ yrs', 'over 240');
eq(formatMonths(Infinity), '∞', 'Infinity');
eq(formatMonths(NaN), '∞', 'NaN treated as not finite');

section('formatNumber');
eq(formatNumber(1.27), '1.27', 'default 2 dp');
eq(formatNumber(1.27, 1), '1.3', 'override 1 dp');
eq(formatNumber(0), '0.00', 'zero');
eq(formatNumber(Infinity), '–', 'Infinity → dash');
eq(formatNumber(NaN), '–', 'NaN → dash');

section('KPI calc — defaults (45k MRR, 8% MoM, 2.5% churn, $1200 CAC, $450 ARPA, 72% GM, $85k burn, $1.2M cash, 3.5% expansion)');
{
  const k = computeKpis(45000, 8, 3.5, 2.5, 1200, 72, 85000, 1_200_000, 450);
  eq(k.arr, 540_000, 'ARR = $540K');
  close(k.ltv, 12_960, 0.01, 'LTV ≈ $12,960');
  close(k.ltvCac, 10.8, 0.01, 'LTV:CAC ≈ 10.8');
  close(k.cacPayback, 3.7037, 0.001, 'CAC payback ≈ 3.70 mo');
  close(k.runway, 14.118, 0.001, 'Runway ≈ 14.12 mo');
  close(k.nrr, 101, 0.001, 'NRR = 101%');
  close(k.magic, 1.2706, 0.001, 'Magic ≈ 1.27');
  close(k.grossProfitPerCust, 324, 0.001, 'GP/customer = $324');
}

section('KPI edge: zero churn (LTV → ∞)');
{
  const k = computeKpis(45000, 8, 3.5, 0, 1200, 72, 85000, 1_200_000, 450);
  eq(k.ltv, Infinity, 'LTV is Infinity');
  eq(k.ltvCac, Infinity, 'LTV:CAC is Infinity');
  eq(k.nrr, 103.5, 'NRR = 100 + 3.5 - 0 = 103.5');
  eq(formatCurrency(k.ltv), '∞', 'formatCurrency renders ∞ (no longer "$InfinityB")');
}

section('KPI edge: zero burn → infinite runway');
{
  const k = computeKpis(45000, 8, 3.5, 2.5, 1200, 72, 0, 1_200_000, 450);
  eq(k.runway, Infinity, 'Runway = ∞');
  eq(k.magic, 0, 'Magic = 0 when no S&M (no burn)');
  eq(formatMonths(k.runway), '∞', 'formatMonths renders ∞');
}

section('KPI edge: zero growth → magic = 0');
{
  const k = computeKpis(45000, 0, 3.5, 2.5, 1200, 72, 85000, 1_200_000, 450);
  eq(k.magic, 0, 'Magic = 0 with 0% growth');
}

section('KPI edge: very high churn (death spiral)');
{
  const k = computeKpis(10000, 0, 0, 10, 5000, 50, 200000, 300_000, 100);
  close(k.ltv, 500, 0.001, 'LTV = $500');
  close(k.ltvCac, 0.1, 0.001, 'LTV:CAC = 0.1');
  close(k.cacPayback, 100, 0.001, 'CAC payback = 100 mo');
  close(k.runway, 1.5, 0.001, 'Runway = 1.5 mo');
  eq(k.nrr, 90, 'NRR = 90 (10% churn)');
  eq(k.magic, 0, 'Magic = 0');
}

section('mrrSeries — defaults');
{
  const s = computeMrrSeries(45000, 8, 36);
  eq(s.length, 37, '37 months (0..36)');
  eq(s[0].base, 45000, 'month 0 base = MRR');
  eq(s[0].optimistic, 45000, 'month 0 optimistic = MRR');
  eq(s[0].pessimistic, 45000, 'month 0 pessimistic = MRR');
  close(s[12].base, 45000 * Math.pow(1.08, 12), 0.01, 'month 12 base compounds');
  close(s[36].base / s[0].base, Math.pow(1.08, 36), 0.001, 'month 36 base ratio = 1.08^36');
  truthy(s[12].optimistic > s[12].base, 'optimistic > base');
  truthy(s[12].pessimistic < s[12].base, 'pessimistic < base');
  close(s[12].optimistic / s[0].optimistic, Math.pow(1 + 0.08*1.2, 12), 0.001, 'optimistic uses 1.2× growth');
  close(s[12].pessimistic / s[0].pessimistic, Math.pow(1 + 0.08*0.7, 12), 0.001, 'pessimistic uses 0.7× growth');
}

section('mrrSeries — zero growth flat');
{
  const s = computeMrrSeries(45000, 0, 36);
  eq(s[0].base, 45000, 'month 0');
  eq(s[12].base, 45000, 'month 12 stays at 45k');
  eq(s[36].base, 45000, 'month 36 stays at 45k');
}

section('cashSeries — defaults (cash recovers as MRR catches up)');
{
  const s = computeCashSeries(45000, 85000, 1_200_000, 8, 36);
  eq(s.rows[0].cash, 1_200_000, 'month 0 cash = starting');
  eq(s.rows[0].danger, null, 'month 0 not in danger');
  truthy(s.rows[1].cash < s.rows[0].cash, 'cash drops month 1');
  // OPEX = 130k. Month 1 projMRR = 45k * 1.08 = 48,600. NetBurn = 130k - 48,600 = 81,400.
  close(s.rows[1].cash, 1_200_000 - 81_400, 0.01, 'month 1 cash = $1,118,600 (dynamic burn already shrinks)');
  // With 8% MoM, MRR catches OPEX around month 14 (log(130/45)/log(1.08) ≈ 13.78)
  // After that, cash should start climbing
  truthy(s.zeroAt === null, 'cash never hits zero with 8% growth');
  // Find min cash row
  let minRow = s.rows[0];
  for (const r of s.rows) if (r.cash < minRow.cash) minRow = r;
  truthy(minRow.month >= 12 && minRow.month <= 18, 'min cash near month 14 (where MRR ≈ OPEX)');
}

section('cashSeries — no growth (cash hits zero ~runway)');
{
  // 1.2M cash, 85k burn, 0% growth → runway = 14.12 mo. zeroAt should be ~15.
  const s = computeCashSeries(45000, 85000, 1_200_000, 0, 36);
  truthy(s.zeroAt !== null, 'zeroAt detected');
  truthy(s.zeroAt >= 14 && s.zeroAt <= 16, 'zero-cash month ~14-15: got ' + s.zeroAt);
  // Cash should hit danger (< 3*burn = 255k) before zero
  const dangerRow = s.rows.find(r => r.danger !== null);
  truthy(dangerRow !== undefined, 'danger zone triggers when cash < 3× burn');
  truthy(dangerRow.month < s.zeroAt, 'danger comes before zero');
}

section('cashSeries — danger zone with high burn');
{
  const s = computeCashSeries(45000, 200000, 300_000, 0, 36);
  // 3*burn = 600k. cash starts at 300k → already in danger from month 1
  const firstDanger = s.rows.find(r => r.danger !== null);
  truthy(firstDanger !== undefined, 'danger triggers');
  // First month with c > 0 in danger
  truthy(firstDanger.month === 1 || firstDanger.month === 2, 'danger fires in month 1-2 with low cash relative to burn');
}

section('retentionSeries');
{
  const r = computeRetentionSeries(2.5);
  eq(r.length, 13, '13 entries (months 0..12)');
  eq(r[0].yours, 100, 'month 0 = 100%');
  eq(r[0].benchmark, 100, 'month 0 benchmark = 100%');
  close(r[12].yours, Math.pow(0.975, 12) * 100, 0.001, 'month 12 = (1-0.025)^12 * 100');
  close(r[12].benchmark, Math.pow(0.996, 12) * 100, 0.001, 'benchmark month 12');
  truthy(r[12].benchmark > r[12].yours, 'benchmark > yours');
  truthy(r[12].gap > 0 && r[12].gap === r[12].benchmark - r[12].yours, 'gap = benchmark - yours');
}

section('retentionSeries — zero churn matches benchmark closely');
{
  const r = computeRetentionSeries(0);
  eq(r[0].yours, 100, 'month 0 = 100%');
  eq(r[12].yours, 100, 'month 12 stays 100% with zero churn');
  // With zero churn, yours > benchmark → gap = max(0, bench - yours) = 0
  eq(r[12].gap, 0, 'gap = 0 when yours > benchmark (clamped to 0)');
}

section('chartInsights — defaults');
{
  const cash = computeCashSeries(45000, 85000, 1_200_000, 8, 36);
  const ret = computeRetentionSeries(2.5);
  const i = computeChartInsights(45000, 8, 85000, cash, ret);
  // mrrMonth12 = 45k * 1.08^12 ≈ 113,302
  close(i.mrrMonth12, 45000 * Math.pow(1.08, 12), 0.01, 'mrrMonth12 ≈ 113.3k');
  close(i.mrrMonth36, 45000 * Math.pow(1.08, 36), 0.01, 'mrrMonth36 ≈ 716k');
  // monthsTo1MARR: 1M ARR = 83,333 MRR. 45k * 1.08^t = 83,333 → t = log(1.852)/log(1.08) ≈ 8.0
  truthy(i.monthsTo1MARR >= 7 && i.monthsTo1MARR <= 9, 'monthsTo1MARR ≈ 8 (got ' + i.monthsTo1MARR + ')');
  // 10M ARR = 833,333 MRR. log(18.52)/log(1.08) ≈ 37.92
  truthy(i.monthsTo10MARR >= 37 && i.monthsTo10MARR <= 39, 'monthsTo10MARR ≈ 38 (got ' + i.monthsTo10MARR + ')');
  // breakEven: 45k * 1.08^t = 130k → t = log(2.889)/log(1.08) ≈ 13.78
  truthy(i.breakEvenMonth >= 13 && i.breakEvenMonth <= 15, 'breakEven ≈ 14 (got ' + i.breakEvenMonth + ')');
}

section('chartInsights — zero growth (unreachable)');
{
  const cash = computeCashSeries(45000, 85000, 1_200_000, 0, 36);
  const ret = computeRetentionSeries(2.5);
  const i = computeChartInsights(45000, 0, 85000, cash, ret);
  eq(i.monthsTo1MARR, null, 'monthsTo1MARR null with no growth');
  eq(i.monthsTo10MARR, null, 'monthsTo10MARR null');
  eq(i.breakEvenMonth, null, 'breakEvenMonth null with no growth');
}

section('chartInsights — already past target');
{
  // High MRR: $200k → ARR = $2.4M. Past $1M.
  const cash = computeCashSeries(200000, 85000, 1_200_000, 8, 36);
  const ret = computeRetentionSeries(2.5);
  const i = computeChartInsights(200000, 8, 85000, cash, ret);
  eq(i.monthsTo1MARR, 0, 'already past $1M ARR');
  truthy(i.monthsTo10MARR > 0, 'still climbing to $10M');
}

/* ============================ DONE ============================ */
console.log('\n' + '='.repeat(50));
console.log('Pass: ' + pass + '   Fail: ' + fail);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  ✗ ' + f.name);
    console.log('    expected:', JSON.stringify(f.expected));
    console.log('    actual:  ', JSON.stringify(f.actual));
  }
  if (typeof process !== 'undefined' && process.exit) process.exit(1);
  else throw new Error(fail + ' test(s) failed');
} else {
  console.log('All tests passed.');
}
