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
| `config.example.js` | Template for users to copy | ✅ |
| `config.local.js` | Your real key | ❌ (gitignored) |
| `.gitignore` | Tells git to ignore the local config | ✅ |
| `SaasFinancialDashboard.jsx` | The original React-component version (no CDN) | ✅ |

## Stack

React 18, Recharts, Tailwind CSS (Play CDN), Lucide-style inline SVG icons, Marked for markdown, Babel-standalone for JSX. All loaded from `esm.sh` / `unpkg` — no `npm install` required.
