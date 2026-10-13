import { translations } from "../client/src/lib/translations";

export type SnapshotLang = "ko" | "en";

export const APP_STORE_URLS: Record<SnapshotLang, string> = {
  ko: "https://apps.apple.com/kr/app/id6799007050",
  en: "https://apps.apple.com/us/app/id6799007050",
};
export const GOOGLE_PLAY_URLS: Record<SnapshotLang, string> = {
  ko: "https://play.google.com/store/apps/details?id=com.thenavy.cardlogue&hl=ko",
  en: "https://play.google.com/store/apps/details?id=com.thenavy.cardlogue&hl=en",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain-HTML copy of what client/src/pages/cardlogue.tsx renders, pasted into
// <div id="root"> by the server. The page is a client-rendered SPA, so the raw
// HTML a crawler downloads was an empty <div id="root"></div> with no headings
// or text — Google renders JS (slowly), but Naver/Bing and link unfurlers
// mostly don't. React's createRoot replaces these children on first render,
// so people see the real page as soon as the bundle runs. It is generated from
// the very same translation strings, so crawlers and visitors see the same
// content (not cloaking). The inline style roughly matches the page's own
// gradient so the swap doesn't flash white.
export function buildCardlogueSnapshot(lang: SnapshotLang): string {
  const t = translations[lang].cardlogue;
  const links = `<p><a href="${APP_STORE_URLS[lang]}" style="color:#D4AF37">${esc(t.hero.ctaAppStore)}</a> · <a href="${GOOGLE_PLAY_URLS[lang]}" style="color:#D4AF37">${esc(t.hero.ctaGooglePlay)}</a></p>`;

  const cards = (items: ReadonlyArray<{ title: string; body: string }>) =>
    items.map((i) => `<h3>${esc(i.title)}</h3><p>${esc(i.body)}</p>`).join("");

  const plans = t.pricing.plans
    .map((p) => `<li><strong>${esc(p.name)}</strong> — ${esc(p.price)} (${esc(p.audience)})</li>`)
    .join("");
  const security = t.security.items.map((i) => `<li>${esc(i)}</li>`).join("");
  const shots = t.screenshots.items.map((i) => `<li>${esc(i.caption)}</li>`).join("");
  const faq = t.faq.items.map((i) => `<h3>${esc(i.q)}</h3><p>${esc(i.a)}</p>`).join("");

  return (
    `<div id="seo-snapshot" style="min-height:100vh;padding:56px 20px;background:linear-gradient(180deg,#0077B6 0%,#03045E 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.65">` +
    `<main style="max-width:720px;margin:0 auto">` +
    `<p style="font-weight:800;letter-spacing:.04em">Cardlogue</p>` +
    `<h1>${esc(t.hero.title)}</h1>` +
    `<p>${esc(t.hero.subtitle)}</p>` +
    links +
    `<h2>${esc(t.screenshots.title)}</h2><ul>${shots}</ul>` +
    cards(t.values) +
    cards(t.features) +
    `<h2>${esc(t.pricing.title)}</h2><ul>${plans}</ul><p>${esc(t.pricing.footnote)}</p>` +
    `<h2>${esc(t.security.title)}</h2><ul>${security}</ul>` +
    `<h2>${esc(t.faq.title)}</h2>${faq}` +
    `<h2>${esc(t.bottomCta.title)}</h2>${links}` +
    `<p><a href="/privacy" style="color:#fff">${esc(t.bottomCta.linkPrivacy)}</a> · <a href="/terms" style="color:#fff">${esc(t.bottomCta.linkTerms)}</a> · <a href="/refund" style="color:#fff">${esc(t.bottomCta.linkRefund)}</a></p>` +
    `<p style="font-size:12px;opacity:.6">${esc(t.bottomCta.businessInfo)}</p>` +
    `</main></div>`
  );
}
