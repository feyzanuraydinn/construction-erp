export interface AuthPageOptions {
  variant: 'success' | 'error';
  lang: string;
  brand: string;
  pageTitle: string;
  title: string;
  message: string;
  hint?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
:root {
  color-scheme: light dark;
  --bg-top: #e0e7ff; --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0;
  --accent: #16a34a; --accent-soft: #dcfce7;
}
body.error { --accent: #dc2626; --accent-soft: #fee2e2; }
@media (prefers-color-scheme: dark) {
  :root { --bg-top: #1e293b; --bg: #0b1120; --card: #111827; --text: #f1f5f9; --muted: #94a3b8; --border: #1f2937; --accent-soft: rgba(22, 163, 74, 0.16); }
  body.error { --accent-soft: rgba(220, 38, 38, 0.16); }
}
* { box-sizing: border-box; margin: 0; }
body {
  min-height: 100vh; display: grid; place-items: center; padding: 24px;
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
  background: radial-gradient(1100px 520px at 50% -12%, var(--bg-top), var(--bg)); color: var(--text);
}
.card {
  width: 100%; max-width: 440px; padding: 36px 32px 26px; text-align: center;
  background: var(--card); border: 1px solid var(--border); border-radius: 20px;
  box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.35); animation: rise 0.45s ease-out both;
}
.brand { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 28px; font-size: 13px; font-weight: 600; color: var(--muted); }
.brand svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.icon { width: 76px; height: 76px; margin: 0 auto 22px; border-radius: 50%; background: var(--accent-soft); display: grid; place-items: center; }
.icon svg { width: 38px; height: 38px; fill: none; stroke: var(--accent); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.icon path { stroke-dasharray: 32; stroke-dashoffset: 32; animation: draw 0.5s 0.2s ease-out forwards; }
h1 { margin-bottom: 10px; font-size: 22px; font-weight: 650; letter-spacing: -0.01em; }
.message { font-size: 15px; line-height: 1.6; color: var(--muted); }
.hint { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border); font-size: 13px; line-height: 1.5; color: var(--muted); }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .card, .icon path { animation: none; stroke-dashoffset: 0; } }
`;

const CLOUD_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg>';
const CHECK_PATH = '<path d="M6 12.5l4 4L18 8"/>';
const CROSS_PATH = '<path d="M8 8l8 8M16 8l-8 8"/>';

export function renderAuthPage(options: AuthPageOptions): string {
  const { variant, lang, brand, pageTitle, title, message, hint } = options;
  const mark = variant === 'success' ? CHECK_PATH : CROSS_PATH;
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<style>${STYLE}</style>
</head>
<body class="${variant}">
<main class="card">
  <div class="brand">${CLOUD_ICON}<span>${escapeHtml(brand)}</span></div>
  <div class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${mark}</svg></div>
  <h1>${escapeHtml(title)}</h1>
  <p class="message">${escapeHtml(message)}</p>
  ${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ''}
</main>
</body>
</html>`;
}
