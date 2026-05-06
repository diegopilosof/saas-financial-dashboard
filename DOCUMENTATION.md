# SaaS Financial Dashboard — Full Documentation

A single-file, browser-based dashboard for live SaaS unit-economics modeling, with an AI-powered CFO-style report. Built by **Diego Pilosof**.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Architecture](#2-architecture)
3. [File structure](#3-file-structure)
4. [The 9 inputs](#4-the-9-inputs)
5. [The 8 KPI cards](#5-the-8-kpi-cards)
6. [The 4 charts](#6-the-4-charts)
7. [Live chart insights](#7-live-chart-insights)
8. [AI report flow](#8-ai-report-flow)
9. [Configuration & API key handling](#9-configuration--api-key-handling)
10. [Tests](#10-tests)
11. [Design decisions](#11-design-decisions)
12. [Extending the dashboard](#12-extending-the-dashboard)
13. [Limitations & caveats](#13-limitations--caveats)

---

## 1. What this is

A live SaaS metrics modeling tool. Move 9 sliders → 8 KPIs and 4 charts update in real time → click a button to get a Claude-generated CFO assessment of the modeled company.

**Audience:** SaaS founders, CFOs, VC analysts, operators who want to stress-test numbers without spinning up a spreadsheet.

**Why it exists:** Most online SaaS calculators ask you a question, give you one number, and stop. This dashboard lets you sweep the entire parameter space (revenue, growth, churn, burn, cash, ARPA, CAC, gross margin) and see all consequences — unit economics, runway, retention, fundraising signals — at once.

---

## 2. Architecture

**Single HTML file, no build step.** Open `dashboard.html` in any modern browser and it runs.

```
Browser
  ├── Tailwind CSS (CDN)               — styling
  ├── React 18 (esm.sh)                — UI runtime
  ├── ReactDOM/client (esm.sh)         — root rendering
  ├── Recharts 2.12 (esm.sh)           — charts
  ├── Marked 12 (esm.sh)               — markdown → HTML for the AI report
  ├── Babel-standalone (unpkg)         — JSX compiler at runtime
  └── config.local.js (local file)     — API key (optional, gitignored)
```

### How the script tags chain together

```
1. <link rel="stylesheet"> Tailwind CDN — applies styling as classes appear in DOM
2. <script type="module"> — fetches React/ReactDOM/Recharts/Marked from esm.sh,
                            assigns each to window.* so the JSX block can read them.
                            Dispatches a 'libs-ready' event on success.
3. <script src="config.local.js"> — sets window.ANTHROPIC_API_KEY if file exists.
                                    404 is fine — modal-entry path still works.
4. <script src="@babel/standalone"> — registers a DOMContentLoaded handler that
                                      finds and compiles <script type="text/babel"> blocks.
5. <script type="text/babel"> — the entire app, compiled and run by Babel.
                                 Polls window.__libsReady before mounting.
```

**Why this approach over a real build:** zero npm dependencies, no build step, works offline after first load (browser caches the CDN scripts). One file you can email or serve from anywhere.

**Trade-off:** First load needs internet (~200KB total from CDNs). After that, browsers cache aggressively, so subsequent loads are instant.

---

## 3. File structure

```
saas-financial-dashboard/
├── dashboard.html               ← the whole app (~1100 lines)
├── SaasFinancialDashboard.jsx   ← original React-component version (build-required)
├── config.example.js            ← template for the API key (gitignored as safety)
├── config.local.js              ← your actual key (gitignored)
├── README.md                    ← quick-start
├── DOCUMENTATION.md             ← this file
├── LICENSE                      ← MIT
├── .gitignore
└── tests/
    └── calc.test.mjs            ← 97 unit tests for the math
```

### What goes to GitHub

`dashboard.html`, `SaasFinancialDashboard.jsx`, `README.md`, `DOCUMENTATION.md`, `LICENSE`, `.gitignore`, `tests/`.

**NOT** committed: `config.local.js`, `config.example.js` (both contain potential keys), `.claude/`, `.DS_Store`.

---

## 4. The 9 inputs

All in the left sidebar. Each input is a slider + paired numeric box. Hover the ℹ️ next to any label for a plain-English explanation and a hint of where to find the value in your real systems.

| Input | Range | Step | Default | What it represents |
|---|---|---|---|---|
| **MRR** | $1K–$500K | $1K | $45K | Sum of all active subscription revenue this month |
| **MoM Growth Rate** | 0–30% | 0.5% | 8% | Month-over-month % growth in MRR |
| **Expansion MRR Rate** | 0–10% | 0.5% | 3.5% | Monthly upsell/cross-sell % from existing customers |
| **ARPA** | $50–$5K | $50 | $450 | Average Revenue Per Account = MRR / Active Customers |
| **Monthly Churn Rate** | 0–15% | 0.1% | 2.5% | % of MRR lost per month from cancellations/downgrades |
| **CAC** | $100–$10K | $50 | $1,200 | Customer Acquisition Cost = S&M Spend / New Customers |
| **Gross Margin** | 30–95% | 1% | 72% | (Revenue − COGS) / Revenue |
| **Monthly Burn Rate** | $10K–$1M | $5K | $85K | Net cash burn per month |
| **Cash in Bank** | $50K–$10M | $50K | $1.2M | Total cash available right now |

### Input behavior

- Slider drag → instant update of every dependent value
- Number-input box → free typing (no mid-keystroke clamping); commits on **blur** or **Enter**
- Number-input clamps to min/max only on commit, so typing "5" before "5000" works

---

## 5. The 8 KPI cards

Auto-derived from the 9 inputs. Each card has:
- Icon + label
- Big number (the value)
- Status-colored subtext (green / yellow / red verdict)
- Status-colored left border
- ℹ️ hover tooltip with formula and benchmarks

The **ARR card is highlighted in lime** as the headline metric (visual mirror of the reference design's "Client pays" card).

### ARR — Annual Recurring Revenue
- **Formula:** `MRR × 12`
- **Why:** Industry-standard valuation benchmark. SaaS companies typically trade at 5–15× ARR depending on growth.

### LTV — Lifetime Value
- **Formula:** `(ARPA × Gross Margin%) / Monthly Churn%`
- **Edge:** If churn = 0, LTV is infinite (rendered as `∞`).
- **Why:** Total gross profit a customer is expected to generate over their lifetime.

### LTV : CAC Ratio
- **Formula:** `LTV / CAC`
- **Status colors:** Green ≥ 3, Yellow 1–3, Red < 1
- **Why:** The single most-watched VC metric for SaaS unit economics. Below 1 = you're losing money on every customer; above 3 = you can scale spend confidently.

### CAC Payback
- **Formula:** `CAC / (ARPA × Gross Margin%)` (in months)
- **Status colors:** Green < 12mo, Yellow 12–18mo, Red > 18mo
- **Why:** How fast you recoup acquisition cost. Faster payback = less working capital tied up in growth.

### Runway (static)
- **Formula:** `Cash in Bank / Monthly Burn Rate` (in months)
- **Status colors:** Green > 18mo, Yellow 12–18mo, Red < 12mo
- **Why:** Months until cash runs out *assuming no growth*. The Cash Runway chart below shows the *dynamic* version that accounts for revenue growth — they can disagree.

### NRR — Net Revenue Retention
- **Formula:** `100% + Expansion MRR Rate − Monthly Churn`
- **Status colors:** Green > 100%, Yellow 80–100%, Red < 80%
- **Why:** A simple proxy. Real NRR includes per-cohort downgrades; this is a fast estimate. Best-in-class SaaS sits >120%.

### Magic Number
- **Formula:** `(MRR × MoM Growth × 12) / (Burn × 0.4)` — assumes 40% of burn is S&M
- **Status colors:** Green ≥ 0.75, Yellow 0.5–0.75, Red < 0.5
- **Why:** Sales efficiency. How much annualized ARR each $1 of S&M generates. The classic Bessemer rule of thumb is ≥0.75 = scale, <0.5 = fix the funnel.

### Zero-Cash Date
- **Value:** `Today + Runway months`, formatted as e.g. "Jul 2027"
- **Subtext:** "In ~14 months"
- **Status:** Mirrors the Runway status

---

## 6. The 4 charts

All charts are Recharts components wrapped in `<ResponsiveContainer width="100%" height="100%">` inside a fixed-height (`h-72`) container. Custom dark tooltips, soft slate-200 grid, slate-500 ticks.

The **projection horizon** for time-series charts = `clamp(36, ceil(runway), 120)` months — always show at least 3 years, extend with runway up to 10 years.

### Chart 1 — MRR Growth Projection (Line Chart)
- **Three lines:** Optimistic (`MoM × 1.2`), Base (`MoM`), Pessimistic (`MoM × 0.7`)
- **Reference lines:** $1M ARR ($83K MRR) and $10M ARR ($833K MRR), dashed gray
- **Tooltip:** Full date ("June 1, 2027") + currency-formatted MRR per scenario
- **Math:** `MRR(t) = MRR₀ × (1 + g)ᵗ` for each growth rate

### Chart 2 — Cash Runway (Area Chart)
- **Cash area:** Lime gradient with black stroke
- **Danger zone:** Red overlay where cash drops below 3× initial monthly burn
- **Reference line:** Dashed red vertical line at zero-cash month (if reached)
- **Math (dynamic burn model):**
  ```
  OPEX = startingMRR + startingBurn  (constant)
  monthlyMRR(t) = MRR₀ × (1 + g)ᵗ
  netBurn(t) = OPEX − monthlyMRR(t)
  cash(t) = cash(t−1) − netBurn(t)
  ```
- **Why dynamic:** If revenue grows fast enough, net burn shrinks and may go negative — cash starts climbing. The static Runway KPI doesn't see this; this chart does.

### Chart 3 — Unit Economics: LTV vs CAC (Bar Chart)
- **Three bars:** CAC (rose), Gross Profit per Customer (amber), LTV (emerald)
- **LTV cap:** Visualization caps LTV at `50 × CAC` so the chart stays readable when churn → 0 sends LTV to infinity. The KPI value still shows `∞`.
- **Why:** Visual answer to "is LTV multiples bigger than CAC?" — at a glance.

### Chart 4 — Cohort Retention Curve (Composed Chart, 12 months)
- **Your retention area:** Lime fill, black stroke. `R(t) = (1 − churn)ᵗ × 100`
- **Benchmark line:** Dashed emerald, `R(t) = (1 − 0.004)ᵗ × 100` (best-in-class B2B SaaS)
- **Gap fill:** Red area stacked between yours and benchmark, only when benchmark > yours
- **Why:** Visualizes how monthly churn compounds into a Year-1 retention deficit.

---

## 7. Live chart insights

Below each chart is a thin lime-bulleted block with **3–4 auto-computed insights** that update instantly with every slider change. These are derived from a `chartInsights` `useMemo` and per-chart `useMemo`s — no API call, always visible.

### MRR Growth insights
- Months to $1M ARR (computed via `Math.ceil(log(target/12 / mrr) / log(1+g))`)
- Months to $10M ARR
- Month 36 base-case MRR & ARR

### Cash Runway insights
- Zero-cash date OR cash-flow break-even date (whichever happens first)
- First month entering the <3-months-burn danger zone (if any)
- OPEX baseline figure

### Unit Economics insights
- LTV : CAC ratio with verdict (healthy / breakeven / losing money)
- Gross profit per customer + CAC payback
- Lever to pull (raise ARPA, raise GM, cut CAC) when ratio < 3

### Retention insights
- Year-1 retention vs benchmark with the gap in percentage points
- Severity verdict (severe leakage / material gap / close to benchmark / best-in-class)
- Average customer lifetime in months

---

## 8. AI report flow

Click **✨ Generate Report** below the KPIs. Five-step flow:

### Step 1 — Modal: company context
Asks 5 optional questions:
1. Free-text product description
2. Customer type (B2C / B2B SMB / B2B Mid-Market / B2B Enterprise)
3. Stage (Pre-revenue / Pre-seed / Seed / Series A / Series B+)
4. Acquisition channel (Inbound / Outbound / PLG / Partners / Mixed)
5. Fundraising plans (Yes actively / In 6–12 months / Not now / Well-funded)

Plus a required Anthropic API key field, pre-filled from `localStorage` or `config.local.js`.

### Step 2 — User message construction
`buildUserMessage` builds a structured prompt containing:
- Company context (or "Not specified")
- All 9 inputs + 8 KPIs as labeled values
- All chart-derived insights (months to $1M / $10M ARR, break-even month, danger month, retention gap)
- Trailing instruction: ground recommendations in the projection numbers

### Step 3 — System prompt
```
You are a senior SaaS CFO advisor and venture capital analyst.
You write sharp, direct, investor-ready financial assessments.
Be specific — always reference the actual numbers provided. Never be generic.

Structure your response in clean markdown with these exact sections:
- Executive Summary
- Strengths 💚
- Red Flags 🔴
- Key Recommendations
- Fundraising Readiness
```

### Step 4 — API call
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Model:** `claude-sonnet-4-6`
- **Max tokens:** 1000 (~$0.015 per report)
- **Browser-direct call:** uses `anthropic-dangerous-direct-browser-access: true` header — no proxy server needed
- **Errors:** 401 (bad key), 400 (low credits), 429 (rate limit), CORS — all rendered in a red error panel with the literal API error message

### Step 5 — Render
- Markdown parsed by Marked → HTML
- Regex post-process colors `## Strengths` headers emerald-600 and `## Red Flags` headers rose-600
- Rendered into a white card with **📋 Copy Report** (uses `navigator.clipboard`, shows ✓ Copied! for 2s) and **✕ Close** buttons

---

## 9. Configuration & API key handling

### The dual-file pattern

The dashboard reads `window.ANTHROPIC_API_KEY` (set by `config.local.js`) as the default for the API-key field. If empty, the modal asks for the key and remembers it via `localStorage`.

**Why a separate file:** keeps the key out of `dashboard.html` so the dashboard itself can be safely shared/committed. The config file is gitignored.

### Setup
```bash
cp config.example.js config.local.js
# edit config.local.js, paste your sk-ant-... key
```

### Key resolution order
1. `localStorage` value (set after first modal submission)
2. `window.ANTHROPIC_API_KEY` from `config.local.js`
3. Empty → modal prompts

### Why `config.example.js` is also gitignored
The original intent was: example file is a clean template (committed), local file holds the key (ignored). In practice users tend to paste the key into whichever file is open, so we gitignore both as a safety net. This means newly cloned repos won't have either file — the README walks new users through creating one.

---

## 10. Tests

`tests/calc.test.mjs` contains **97 assertions** across all pure functions:

```bash
# Node:
node tests/calc.test.mjs

# macOS built-in (no install):
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/calc.test.mjs
```

### Coverage
| Group | Tests |
|---|---|
| `formatCurrency` | 15 (incl. K/M/B boundaries, negative, Infinity, NaN, null) |
| `formatPercent` / `formatMonths` / `formatNumber` | 13 |
| KPI defaults | 7 |
| KPI edge cases (zero churn, zero burn, zero growth, death spiral) | 13 |
| `mrrSeries` | 10 |
| `cashSeries` (recovery, no growth, danger zone) | 12 |
| `retentionSeries` | 9 |
| `chartInsights` (defaults + edge cases) | 18 |

### Maintaining tests

The test file **mirrors** the calc functions from `dashboard.html` (it doesn't import from the HTML). If you change a formula in `dashboard.html`, copy the change into `tests/calc.test.mjs` so the tests stay aligned.

---

## 11. Design decisions

### Why pure-CSS hover tooltips (`group` + `group-hover`) instead of state-driven?
React state updates would re-render the heavy chart components on every hover. Pure CSS keeps tooltip interactions cost-free. Trade-off: not keyboard-focusable.

### Why dark tooltips on a light theme?
Contrast. Light tooltips on white cards are unreadable. Dark `bg-slate-900` with white text reads cleanly against the mint background and white cards alike.

### Why `localStorage` over a config file alone?
`config.local.js` is permanent but requires editing a file. `localStorage` is convenient (paste once in modal, done) but per-browser. Supporting both means: power users edit the file once, casual users use the modal.

### Why CDN over a build step?
Zero install, zero build, runs from a flash drive. The cost is ~200KB of CDN downloads on first load. For a single-user analytical tool that's the right trade.

### Why `claude-sonnet-4-6` for the report?
Best balance of CFO-grade analysis quality and cost (~$0.015/report). Opus 4.7 is overkill for a 1000-token output; Haiku is too terse for nuanced financial commentary.

### Why store the API key client-side at all (vs proxy)?
A proxy means hosting infra. The dashboard's whole pitch is "open the file." Browser-direct works fine for personal use; if you ever multi-tenant this, then add a proxy.

### Why a static "Runway" KPI when the chart shows dynamic?
The static version is what every VC asks about: "How long do you have at current burn?" It's a legible single number. The chart layers on the projection so users see both views.

---

## 12. Extending the dashboard

### Add a new input
1. Add a `useState` in `SaasFinancialDashboard`
2. Add a `<SliderInput>` block in the sidebar
3. If it affects KPIs/charts, add to the relevant `useMemo` deps
4. Mirror in `tests/calc.test.mjs`

### Add a new KPI card
1. Compute the value inside the `kpis` useMemo
2. Add a `<KpiCard>` in the KPI section
3. Define the status thresholds (green/yellow/red bands)
4. Write the tooltip — be specific about the formula and benchmarks

### Add a new chart
1. Compute the data series in a new `useMemo`
2. Add a `<ChartCard>` with a Recharts `<ResponsiveContainer>` inside
3. Compute the chart's auto-insights in another `useMemo`, pass via `insights` prop
4. Add a `tooltip` prop explaining what the chart shows
5. Test the math in `tests/calc.test.mjs`

### Change the AI prompt
Edit `SYSTEM_PROMPT` and/or `buildUserMessage`. Reload the dashboard — no rebuild.

### Swap the model
Change the `model` field in `callClaude` (currently `claude-sonnet-4-6`).

---

## 13. Limitations & caveats

### Calculation limitations
- **NRR is a proxy**, not a real cohort calculation. It assumes expansion and churn act independently and uniformly across the customer base.
- **Magic Number assumes 40% of burn is S&M.** This is an industry default but can be wildly off depending on company structure (high R&D burn, etc.)
- **Pessimistic/optimistic in MRR projection are multiplicative on the growth rate** (×0.7 / ×1.2). Some interpretations subtract 30 percentage points instead. Adjust if you prefer that interpretation.
- **Cash projection assumes static OPEX** — your hiring plan / scale-up costs aren't modeled.
- **Retention curve uses a single churn rate** — no cohort-level differentiation.

### UX limitations
- **Pure-CSS tooltips aren't keyboard-accessible.** Hover-only.
- **Modal form fields persist between opens** — could surprise users who expect a clean slate.
- **No undo/redo** for slider changes.
- **No data export** — can't save scenarios or compare two parameter sets side-by-side.
- **Single-user.** No cloud, no sharing, no presets.

### Technical limitations
- **First load requires internet.** All libraries come from CDN.
- **Tailwind CDN's JIT** scans the DOM at runtime to generate CSS. Dynamic class names constructed at runtime usually work, but rarely a class won't be picked up.
- **No tests for the React components themselves** — only the pure math. Adding component tests would require Jest + jsdom or Playwright.
- **Race condition on rapid double-click of Generate Report** — last response to land overwrites earlier. Not fixed; unlikely on a single-user tool.

---

*Last updated: 2026-05-06. Built with Claude Code assistance. Math verified by 97 unit tests.*
