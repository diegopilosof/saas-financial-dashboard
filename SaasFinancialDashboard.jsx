import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
} from 'recharts';
import {
  Info, TrendingUp, DollarSign, Users, Activity, Flame,
  Wallet, BarChart3, Target, Calendar, Zap, Repeat,
} from 'lucide-react';

/* ---------- formatting ---------- */
const formatCurrency = (val) => {
  if (val === null || val === undefined || Number.isNaN(val)) return '–';
  const v = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(0)}K`;
  return `${sign}$${Math.round(v)}`;
};
const formatPercent = (val) => {
  if (val === null || val === undefined || Number.isNaN(val) || !Number.isFinite(val)) return '–';
  return `${val.toFixed(1)}%`;
};
const formatMonths = (val) => {
  if (!Number.isFinite(val)) return '∞';
  if (val > 240) return '20+ yrs';
  return `${val.toFixed(1)} mo`;
};
const formatNumber = (val, dp = 2) => {
  if (!Number.isFinite(val)) return '–';
  return val.toFixed(dp);
};
const monthLabel = (offset) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

/* ---------- reusable: pure-CSS hover tooltip ---------- */
const HoverTip = ({ children, className = '' }) => (
  <div
    role="tooltip"
    className={
      'pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 ' +
      'transition-opacity duration-150 absolute z-50 bg-slate-700 text-white text-xs ' +
      'leading-relaxed rounded-lg p-3 shadow-xl ring-1 ring-black/20 max-w-xs w-64 ' +
      className
    }
  >
    {children}
  </div>
);

/* ---------- input row: slider + numeric, both controlled ---------- */
const SliderInput = ({
  label, icon: Icon, value, onChange, min, max, step, format, tooltip, accent = 'indigo',
}) => {
  const clamp = (v) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <div className="group relative inline-flex items-center gap-1.5 cursor-help">
          {Icon && <Icon size={14} className="text-slate-400" />}
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">
            {label}
          </span>
          <Info size={12} className="text-slate-500" />
          <HoverTip className="left-0 top-full mt-1.5">{tooltip}</HoverTip>
        </div>
        <span className={`text-sm font-mono font-semibold text-${accent}-300`}>
          {format(value)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(+e.target.value))}
          className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(+e.target.value))}
          className="w-24 bg-slate-900 border border-slate-700 text-slate-100 px-2 py-1 rounded text-xs font-mono focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

/* ---------- KPI card ---------- */
const KpiCard = ({ icon: Icon, label, value, subtext, status = 'neutral', tooltip }) => {
  const border = {
    green: 'border-l-emerald-500',
    yellow: 'border-l-amber-500',
    red: 'border-l-rose-500',
    neutral: 'border-l-indigo-500',
  }[status];
  const subColor = {
    green: 'text-emerald-400',
    yellow: 'text-amber-400',
    red: 'text-rose-400',
    neutral: 'text-slate-400',
  }[status];
  return (
    <div
      className={
        `group relative bg-slate-800/80 backdrop-blur rounded-xl p-4 shadow-lg ` +
        `border-l-4 ${border} hover:bg-slate-800 transition-colors cursor-help`
      }
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={13} className="text-slate-400" />}
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          {label}
        </span>
        <Info size={11} className="text-slate-500 ml-auto" />
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      {subtext && <div className={`text-[11px] mt-1 ${subColor}`}>{subtext}</div>}
      <HoverTip className="left-0 top-full mt-2">{tooltip}</HoverTip>
    </div>
  );
};

/* ---------- chart frame ---------- */
const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 shadow-lg flex flex-col">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="h-72">{children}</div>
  </div>
);

/* ---------- recharts custom tooltip ---------- */
const RechartsTooltip = ({ active, payload, label, valueFormatter, labelFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-700 text-white text-xs rounded-lg p-3 shadow-xl ring-1 ring-black/20">
      <div className="font-semibold mb-1.5 text-slate-200">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-mono font-semibold ml-auto">
            {valueFormatter ? valueFormatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ---------- main component ---------- */
export default function SaasFinancialDashboard() {
  const [mrr, setMrr] = useState(45000);
  const [momGrowth, setMomGrowth] = useState(8);
  const [expansionRate, setExpansionRate] = useState(3.5);
  const [churn, setChurn] = useState(2.5);
  const [cac, setCac] = useState(1200);
  const [grossMargin, setGrossMargin] = useState(72);
  const [burn, setBurn] = useState(85000);
  const [cash, setCash] = useState(1200000);
  const [arpa, setArpa] = useState(450);

  /* ---------- derived KPIs ---------- */
  const kpis = useMemo(() => {
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
    const zeroCashOffset = Number.isFinite(runway) ? Math.round(runway) : 0;
    const zeroCashDate = Number.isFinite(runway)
      ? monthLabel(zeroCashOffset)
      : 'Cash positive';
    return {
      arr, ltv, ltvCac, cacPayback, runway, nrr, magic, zeroCashDate,
      grossProfitPerCust,
    };
  }, [mrr, momGrowth, expansionRate, churn, cac, grossMargin, burn, cash, arpa]);

  /* ---------- projection horizon ---------- */
  const horizon = useMemo(() => {
    const r = Number.isFinite(kpis.runway) ? Math.ceil(kpis.runway) : 36;
    return Math.min(120, Math.max(36, r));
  }, [kpis.runway]);

  /* ---------- chart 1: MRR projection ---------- */
  const mrrSeries = useMemo(() => {
    const base = momGrowth / 100;
    const opt = base * 1.2;
    const pess = base * 0.7;
    return Array.from({ length: horizon + 1 }, (_, i) => ({
      month: i,
      label: monthLabel(i),
      base: mrr * Math.pow(1 + base, i),
      optimistic: mrr * Math.pow(1 + opt, i),
      pessimistic: mrr * Math.pow(1 + pess, i),
    }));
  }, [mrr, momGrowth, horizon]);

  /* ---------- chart 2: cash runway with dynamic burn ---------- */
  const cashSeries = useMemo(() => {
    const opex = mrr + burn;
    const base = momGrowth / 100;
    let c = cash;
    let zeroAt = null;
    const rows = [{
      month: 0, label: monthLabel(0), cash: c, danger: null, monthlyBurn: burn,
    }];
    for (let i = 1; i <= horizon; i++) {
      const projMrr = mrr * Math.pow(1 + base, i);
      const netBurn = opex - projMrr;
      c = c - netBurn;
      const positiveBurn = Math.max(netBurn, 0);
      const dangerThreshold = positiveBurn * 3;
      const inDanger = c > 0 && positiveBurn > 0 && c < dangerThreshold;
      if (zeroAt === null && c <= 0) zeroAt = i;
      rows.push({
        month: i,
        label: monthLabel(i),
        cash: Math.max(c, 0),
        danger: inDanger ? Math.max(c, 0) : null,
        monthlyBurn: netBurn,
      });
    }
    return { rows, zeroAt };
  }, [mrr, burn, cash, momGrowth, horizon]);

  /* ---------- chart 3: unit economics ---------- */
  const unitEconSeries = useMemo(() => {
    const cappedLtv = Number.isFinite(kpis.ltv) ? Math.min(kpis.ltv, cac * 50) : cac * 50;
    return [
      { name: 'CAC', value: cac, fill: '#f43f5e' },
      { name: 'Gross Profit / Cust', value: kpis.grossProfitPerCust, fill: '#f59e0b' },
      { name: 'LTV', value: cappedLtv, fill: '#10b981' },
    ];
  }, [cac, kpis.ltv, kpis.grossProfitPerCust]);

  /* ---------- chart 4: cohort retention ---------- */
  const retentionSeries = useMemo(() => {
    const yourChurn = churn / 100;
    const benchChurn = 0.004;
    return Array.from({ length: 13 }, (_, i) => {
      const yours = Math.pow(1 - yourChurn, i) * 100;
      const bench = Math.pow(1 - benchChurn, i) * 100;
      return {
        month: i,
        yours,
        benchmark: bench,
        gap: Math.max(0, bench - yours),
      };
    });
  }, [churn]);

  /* ---------- KPI status helpers ---------- */
  const ltvCacStatus = kpis.ltvCac >= 3 ? 'green' : kpis.ltvCac >= 1 ? 'yellow' : 'red';
  const paybackStatus = kpis.cacPayback < 12 ? 'green' : kpis.cacPayback <= 18 ? 'yellow' : 'red';
  const runwayStatus = kpis.runway > 18 ? 'green' : kpis.runway >= 12 ? 'yellow' : 'red';
  const nrrStatus = kpis.nrr > 100 ? 'green' : kpis.nrr >= 80 ? 'yellow' : 'red';
  const magicStatus = kpis.magic >= 0.75 ? 'green' : kpis.magic >= 0.5 ? 'yellow' : 'red';

  const tickAxis = { fill: '#94a3b8', fontSize: 11 };
  const grid = '#1e293b';
  const xTickFormatter = (i) => (i % 6 === 0 ? monthLabel(i) : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100">
      {/* header */}
      <header className="px-6 py-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              SaaS Financial Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Real-time metrics for growth-stage startups
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 p-6">
        {/* ----- INPUT PANEL ----- */}
        <aside className="bg-slate-800/60 backdrop-blur rounded-xl p-5 shadow-lg h-fit lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Inputs
            </h2>
          </div>

          <div className="mb-5">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Revenue
            </h3>
            <SliderInput
              label="MRR" icon={DollarSign}
              value={mrr} onChange={setMrr}
              min={1000} max={500000} step={1000}
              format={formatCurrency}
              tooltip="Monthly Recurring Revenue. Sum of all active subscription revenue in a given month. Find it in your billing platform (Stripe, Chargebee, Recurly) or CRM. The heartbeat of any SaaS business."
            />
            <SliderInput
              label="MoM Growth Rate" icon={TrendingUp}
              value={momGrowth} onChange={setMomGrowth}
              min={0} max={30} step={0.5}
              format={formatPercent}
              tooltip="Month-over-Month growth in new MRR. Calculate it as: (This month's MRR − Last month's MRR) / Last month's MRR × 100. Healthy early-stage SaaS: 10–20%. Find it by comparing monthly revenue exports from your billing tool."
            />
            <SliderInput
              label="Expansion MRR Rate" icon={Repeat}
              value={expansionRate} onChange={setExpansionRate}
              min={0} max={10} step={0.5}
              format={formatPercent}
              tooltip="Percentage of new revenue generated from existing customers (upsells, cross-sells). Find it in your billing platform. Crucial for offsetting churn."
            />
            <SliderInput
              label="ARPA" icon={Users}
              value={arpa} onChange={setArpa}
              min={50} max={5000} step={50}
              format={formatCurrency}
              tooltip="Average Revenue Per Account. Average MRR per paying customer. Formula: MRR / Total active customers. Find it in your billing platform. Drives LTV and segmentation strategy."
            />
          </div>

          <div className="mb-5">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Customer Economics
            </h3>
            <SliderInput
              label="Monthly Churn Rate" icon={Activity}
              value={churn} onChange={setChurn}
              min={0} max={15} step={0.1}
              format={formatPercent}
              tooltip="Percentage of MRR lost each month from cancellations or downgrades. Formula: Churned MRR / MRR at start of month × 100. Find it in your subscription analytics. Best-in-class B2B SaaS: below 1% monthly."
            />
            <SliderInput
              label="CAC" icon={Target}
              value={cac} onChange={setCac}
              min={100} max={10000} step={50}
              format={formatCurrency}
              tooltip="Customer Acquisition Cost. Total sales & marketing spend divided by number of new customers acquired in the same period. Formula: S&M spend / New customers. Find S&M spend in your P&L or accounting software (QuickBooks, Xero)."
            />
            <SliderInput
              label="Gross Margin" icon={BarChart3}
              value={grossMargin} onChange={setGrossMargin}
              min={30} max={95} step={1}
              format={formatPercent}
              tooltip="Revenue minus Cost of Goods Sold (COGS), divided by Revenue. For SaaS, COGS includes hosting, support, onboarding. Find it in your P&L. Healthy SaaS: 70–85%."
            />
          </div>

          <div>
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Cash Position
            </h3>
            <SliderInput
              label="Monthly Burn Rate" icon={Flame}
              value={burn} onChange={setBurn}
              min={10000} max={1000000} step={5000}
              format={formatCurrency}
              tooltip="Net cash your company spends each month (cash out minus cash in from operations). Find it in your bank statement or cash flow statement. Critical for survival planning."
            />
            <SliderInput
              label="Cash in Bank" icon={Wallet}
              value={cash} onChange={setCash}
              min={50000} max={10000000} step={50000}
              format={formatCurrency}
              tooltip="Total liquid cash available right now across all company accounts. Check your bank dashboard or balance sheet. This is your 'fuel tank'."
            />
          </div>
        </aside>

        {/* ----- MAIN ----- */}
        <main className="space-y-6 min-w-0">
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign}
              label="ARR"
              value={formatCurrency(kpis.arr)}
              subtext={`Based on $${(mrr/1000).toFixed(0)}K MRR × 12`}
              status="neutral"
              tooltip="Annual Recurring Revenue = MRR × 12. The standard benchmark VCs use to value SaaS companies. Rule of thumb: SaaS companies trade at 5–15× ARR depending on growth."
            />
            <KpiCard
              icon={Users}
              label="LTV"
              value={formatCurrency(kpis.ltv)}
              subtext={Number.isFinite(kpis.ltv) ? `${(kpis.ltv/cac).toFixed(1)}× CAC` : 'Zero churn'}
              status="neutral"
              tooltip="Lifetime Value. Expected total revenue from one customer over their lifetime. Formula: ARPA × Gross Margin% / Monthly Churn. Higher is better. Target: LTV should be at least 3× your CAC."
            />
            <KpiCard
              icon={Target}
              label="LTV : CAC"
              value={Number.isFinite(kpis.ltvCac) ? `${kpis.ltvCac.toFixed(1)}×` : '∞'}
              subtext={
                kpis.ltvCac >= 3 ? 'Healthy unit economics'
                : kpis.ltvCac >= 1 ? 'Breaking even'
                : 'Losing money on each customer'
              }
              status={ltvCacStatus}
              tooltip="How much value you generate per dollar spent acquiring a customer. Formula: LTV / CAC. Green (>3): healthy. Yellow (1–3): breaking even. Red (<1): losing money on every customer."
            />
            <KpiCard
              icon={Calendar}
              label="CAC Payback"
              value={formatMonths(kpis.cacPayback)}
              subtext={
                kpis.cacPayback < 12 ? 'Fast recovery'
                : kpis.cacPayback <= 18 ? 'Acceptable'
                : 'Too slow — investigate'
              }
              status={paybackStatus}
              tooltip="How many months to recover your CAC from a customer's gross profit. Formula: CAC / (ARPA × Gross Margin%). Green: <12 months. Yellow: 12–18 months. Red: >18 months."
            />
            <KpiCard
              icon={Wallet}
              label="Runway"
              value={formatMonths(kpis.runway)}
              subtext={
                kpis.runway > 18 ? 'Plenty of time'
                : kpis.runway >= 12 ? 'Start planning raise'
                : 'Raise or cut burn now'
              }
              status={runwayStatus}
              tooltip="How many months your company can operate before running out of cash at current burn. Formula: Cash in Bank / Monthly Burn Rate. This is also your projection horizon. Green: >18 months. Yellow: 12–18 months. Red: <12 months — time to fundraise or cut burn."
            />
            <KpiCard
              icon={Repeat}
              label="NRR"
              value={formatPercent(kpis.nrr)}
              subtext={
                kpis.nrr > 120 ? 'World-class'
                : kpis.nrr > 100 ? 'Net expansion'
                : kpis.nrr >= 80 ? 'Below par' : 'Severe leakage'
              }
              status={nrrStatus}
              tooltip="Net Revenue Retention. Percentage of MRR retained from existing customers. Formula: 100% + Expansion MRR Rate − Monthly Churn Rate. World-class: >120%. Good: >100% (expansion offsets churn)."
            />
            <KpiCard
              icon={Zap}
              label="Magic Number"
              value={formatNumber(kpis.magic)}
              subtext={
                kpis.magic >= 0.75 ? 'Efficient growth engine'
                : kpis.magic >= 0.5 ? 'Acceptable' : 'Inefficient spend'
              }
              status={magicStatus}
              tooltip="Estimated Magic Number. Sales efficiency ratio. How much ARR you generate for every dollar spent on S&M. Formula: (MRR growth × 12) / S&M spend. Above 0.75 = efficient growth engine. S&M assumed at 40% of burn for this estimate."
            />
            <KpiCard
              icon={Calendar}
              label="Zero-Cash Date"
              value={kpis.zeroCashDate}
              subtext={Number.isFinite(kpis.runway) ? `In ~${Math.round(kpis.runway)} months` : 'Cash flow positive'}
              status={runwayStatus}
              tooltip="Projected Zero-Cash Date. The calendar month when cash hits zero at current burn rate with no new revenue offset. Calculated automatically. This is why fundraising timelines matter — add 6 months buffer."
            />
          </section>

          {/* CHARTS */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart 1: MRR projection */}
            <ChartCard
              title="MRR Growth Projection"
              subtitle={`Base, optimistic (+20%), pessimistic (−30%) over ${horizon} months`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrrSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={tickAxis}
                    tickFormatter={xTickFormatter}
                    stroke="#475569"
                  />
                  <YAxis
                    tick={tickAxis}
                    tickFormatter={formatCurrency}
                    stroke="#475569"
                    width={60}
                  />
                  <RTooltip
                    content={
                      <RechartsTooltip
                        valueFormatter={formatCurrency}
                        labelFormatter={(m) => monthLabel(m)}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                  <ReferenceLine
                    y={1_000_000 / 12}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: '$1M ARR', fill: '#94a3b8', fontSize: 10, position: 'right' }}
                  />
                  <ReferenceLine
                    y={10_000_000 / 12}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: '$10M ARR', fill: '#94a3b8', fontSize: 10, position: 'right' }}
                  />
                  <Line
                    type="monotone" dataKey="optimistic" name="Optimistic"
                    stroke="#10b981" strokeWidth={2} dot={false}
                    isAnimationActive
                  />
                  <Line
                    type="monotone" dataKey="base" name="Base"
                    stroke="#6366f1" strokeWidth={2.5} dot={false}
                    isAnimationActive
                  />
                  <Line
                    type="monotone" dataKey="pessimistic" name="Pessimistic"
                    stroke="#f43f5e" strokeWidth={2} dot={false}
                    strokeDasharray="5 5"
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 2: Cash runway */}
            <ChartCard
              title="Cash Runway"
              subtitle={`Dynamic burn = OPEX (${formatCurrency(mrr + burn)}) − projected MRR each month`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashSeries.rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={tickAxis}
                    tickFormatter={xTickFormatter}
                    stroke="#475569"
                  />
                  <YAxis
                    tick={tickAxis}
                    tickFormatter={formatCurrency}
                    stroke="#475569"
                    width={60}
                  />
                  <RTooltip
                    content={
                      <RechartsTooltip
                        valueFormatter={formatCurrency}
                        labelFormatter={(m) => monthLabel(m)}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                  <Area
                    type="monotone" dataKey="cash" name="Cash Remaining"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#cashGrad)"
                    isAnimationActive
                  />
                  <Area
                    type="monotone" dataKey="danger" name="Danger Zone (<3mo burn)"
                    stroke="#f43f5e" strokeWidth={2}
                    fill="url(#dangerGrad)"
                    connectNulls={false}
                    isAnimationActive
                  />
                  {cashSeries.zeroAt && (
                    <ReferenceLine
                      x={cashSeries.zeroAt}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{
                        value: `Zero @ ${monthLabel(cashSeries.zeroAt)}`,
                        fill: '#f43f5e', fontSize: 10, position: 'top',
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 3: Unit Economics */}
            <ChartCard
              title="Unit Economics: LTV vs CAC"
              subtitle="Should LTV dwarf CAC? Visual comparison of value per customer"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitEconSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={tickAxis} stroke="#475569" />
                  <YAxis
                    tick={tickAxis}
                    tickFormatter={formatCurrency}
                    stroke="#475569"
                    width={60}
                  />
                  <RTooltip content={<RechartsTooltip valueFormatter={formatCurrency} />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive>
                    {unitEconSeries.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 4: Cohort retention */}
            <ChartCard
              title="Cohort Retention Curve"
              subtitle={`Your ${formatPercent(churn)} churn vs best-in-class 0.4% benchmark`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={retentionSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={tickAxis}
                    stroke="#475569"
                    label={{ value: 'Month', fill: '#94a3b8', fontSize: 10, position: 'insideBottom', offset: -2 }}
                  />
                  <YAxis
                    tick={tickAxis}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    stroke="#475569"
                    width={50}
                    domain={[0, 100]}
                  />
                  <RTooltip
                    content={
                      <RechartsTooltip
                        valueFormatter={(v) => `${v.toFixed(1)}%`}
                        labelFormatter={(m) => `Month ${m}`}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                  <Area
                    type="monotone" dataKey="yours" name="Your Retention"
                    stackId="r"
                    stroke="#6366f1" strokeWidth={2}
                    fill="#6366f1" fillOpacity={0.25}
                    isAnimationActive
                  />
                  <Area
                    type="monotone" dataKey="gap" name="Gap to Benchmark"
                    stackId="r"
                    stroke="none"
                    fill="#f43f5e" fillOpacity={0.3}
                    isAnimationActive
                  />
                  <Line
                    type="monotone" dataKey="benchmark" name="Benchmark (0.4%)"
                    stroke="#10b981" strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        </main>
      </div>
    </div>
  );
}
