# SaaS Financial Dashboard

A single-file, interactive dashboard for SaaS unit economics — MRR, ARR, LTV, CAC, runway, magic number, retention — plus an AI-generated CFO-style report powered by the Anthropic API.

Built by **Diego Pilosof**.

## Run it

Just open `dashboard.html` in any modern browser (Chrome, Safari, Firefox, Edge). No build step, no server. First load needs internet to pull React, Recharts, Tailwind, and Marked from CDN.

## Optional: pre-fill your Anthropic API key

The "Generate Report" button calls Claude. By default it asks for your key in the modal and remembers it in `localStorage`. If you want the key pre-filled automatically on every device:

1. Copy the template:
   ```bash
   cp config.example.js config.local.js
   ```
2. Open `config.local.js` and paste your key:
   ```js
   window.ANTHROPIC_API_KEY = 'sk-ant-api03-...';
   ```
3. Save. Reload `dashboard.html` — the modal field is pre-filled.

`config.local.js` is gitignored, so your key never reaches GitHub.

Get a key at <https://console.anthropic.com/settings/keys>.

## Files

| File | Purpose | Committed? |
|---|---|---|
| `dashboard.html` | The whole app | ✅ |
| `config.example.js` | Local config (your key) — gitignored as a safety net | ❌ |
| `config.local.js` | Local config (your key) — gitignored | ❌ |
| `.gitignore` | Tells git to ignore the config files | ✅ |
| `SaasFinancialDashboard.jsx` | The original React-component version (no CDN) | ✅ |
| `tests/calc.test.mjs` | Unit tests for formatters and KPI math | ✅ |

## Tests

97 unit tests covering every formatter, KPI calculation, projection series, and chart-insight derivation across edge cases (Infinity, zero-divide, hyper-growth, death-spiral, already-past-milestone).

```bash
# With Node:
node tests/calc.test.mjs

# Or with macOS's built-in JavaScriptCore (no install needed):
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/calc.test.mjs
```

If you change a calculation in `dashboard.html`, mirror the change in `tests/calc.test.mjs` so the tests stay aligned.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and distribute. No warranty.

## Stack

React 18, Recharts, Tailwind CSS (Play CDN), Lucide-style inline SVG icons, Marked for markdown, Babel-standalone for JSX. All loaded from `esm.sh` / `unpkg` — no `npm install` required.
