import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getPublicMyCard } from "./mycard";
import { buildCardlogueSnapshot } from "./cardlogue-snapshot";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Paddle's domain review rejected globalmarketradar.com because the site's
// own homepage describes The Navy as an app-development studio ("IT
// Services/Software Development Services"), a category outside Paddle's
// Acceptable Use Policy — even though Cardlogue itself (what's actually
// charged through Paddle) is a plain SaaS subscription. Rather than change
// what the main site says about itself, a dedicated subdomain is scoped to
// show only Cardlogue-related content for Paddle's (and any future PG's)
// review: everything else on this host redirects to /cardlogue.
const CARDLOGUE_ONLY_HOST = "cardlogue.globalmarketradar.com";
const CARDLOGUE_ONLY_ALLOWED_PREFIXES = [
  "/cardlogue",
  "/team",
  "/privacy",
  "/terms",
  "/refund",
  "/account-deletion",
  "/api",
];

// Mirrors the <Route> paths in client/src/App.tsx (trailing slash allowed).
const CLIENT_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/cardlogue\/?$/,
  /^\/cardlogue\/card\/[^/]+\/?$/,
  /^\/team\/(payment|login|manage|cards)\/?$/,
  /^\/(privacy|terms|refund|account-deletion|login|auth|reset-password|dashboard|archive|admin)\/?$/,
  /^\/oauth\/consent\/?$/,
  /^\/report\/[^/]+\/?$/,
];

// Renders index.html with Cardlogue's own title/description/OG tags baked
// in server-side, for crawlers that never run client JS (react-helmet-async
// is client-side only). Shared by both the registered OAuth/Paddle homepage
// URL ("/") and "/cardlogue" itself, so neither ever falls back to The
// Navy's own copy — a verifier that doesn't follow redirects (Google's OAuth
// branding check appears not to) must see this directly at "/", a 302
// isn't enough.
function renderCardloguePage(distPath: string, req: express.Request, res: express.Response) {
  let html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  const isKo = (req.headers["accept-language"] || "").toLowerCase().startsWith("ko");
  const title = isKo
    ? "카드로그 — 광고 없는 명함관리 앱 | AI 명함 스캔·팀 명함첩"
    : "Cardlogue — AI Business Card Scanner & Team Card Book";
  const description = isKo
    ? "광고 없는 명함관리 앱 카드로그(Cardlogue). AI로 명함을 스캔하고, 디지털 명함을 QR코드로 공유하고, 팀원과 팀 명함첩을 함께 관리하세요. 7일 무료 체험."
    : "Ad-free business card manager. Scan business cards with AI, share your digital business card by QR code, and keep a shared team card book. Try it free for 7 days.";
  const image = "https://globalmarketradar.com/cardlogue-icon.png";
  // Structured data for crawlers that don't run client JS. No aggregateRating
  // on purpose — the app has no ratings yet and fabricating one is a policy
  // violation; add it only once the stores report real numbers.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Cardlogue",
    alternateName: "카드로그",
    description,
    url: "https://globalmarketradar.com/cardlogue",
    image,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, iOS",
    inLanguage: ["ko", "en"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    sameAs: [
      "https://apps.apple.com/kr/app/id6799007050",
      "https://play.google.com/store/apps/details?id=com.thenavy.cardlogue",
    ],
    publisher: { "@type": "Organization", name: "The Navy", url: "https://globalmarketradar.com" },
  }).replace(/</g, "\\u003c");
  const snapshot = buildCardlogueSnapshot(isKo ? "ko" : "en");
  html = html
    .replace(/<html lang=".*?"/, `<html lang="${isKo ? "ko" : "en"}"`)
    // Function replacer: the snapshot contains "$" (prices), which a string
    // replacement would treat as a special pattern.
    .replace('<div id="root"></div>', () => `<div id="root">${snapshot}</div>`)
    // index.html pins maximum-scale=1 for the payment WebView (stops iOS
    // zooming on input focus); this marketing page has no such inputs, so
    // let people pinch-zoom here (Lighthouse accessibility + Google mobile UX).
    .replace(/<meta name="viewport" content=".*?"\s*\/>/, `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`)
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${image}" />`)
    .replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${image}" />`)
    // Replace index.html's static default canonical (which points at the
    // site root) rather than appending a second one — two <link
    // rel="canonical"> tags on one page is invalid and Google's own
    // guidance says the outcome is undefined, so this must overwrite, not
    // add to, the existing tag.
    .replace(/<link rel="canonical" href=".*?"\s*\/>/, `<link rel="canonical" href="https://globalmarketradar.com/cardlogue" />`)
    .replace(
      "</head>",
      `<meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><script type="application/ld+json">${jsonLd}</script></head>`,
    );
  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // The registered OAuth/Paddle "homepage" URL is the bare subdomain root —
  // serve Cardlogue content directly there (200, no redirect) rather than
  // bouncing to /cardlogue, since an automated homepage verifier may not
  // follow redirects at all.
  app.get("/", (req, res, next) => {
    if (req.hostname !== CARDLOGUE_ONLY_HOST) return next();
    return renderCardloguePage(distPath, req, res);
  });

  app.use((req, res, next) => {
    if (req.hostname !== CARDLOGUE_ONLY_HOST) return next();
    // A file extension means this is a static asset request (image, font,
    // icon, robots.txt, etc.), never an SPA route — always let those through,
    // otherwise every logo/icon on the page 404s into an HTML redirect body.
    if (path.extname(req.path)) return next();
    if (CARDLOGUE_ONLY_ALLOWED_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return next();
    }
    return res.redirect(302, "/cardlogue");
  });

  // Link-preview crawlers (KakaoTalk, iMessage, etc.) fetch this URL and
  // parse the raw HTML without running JS, so react-helmet-async's
  // client-side <meta> tags never reach them — they always see whatever
  // index.html ships with. Swap in the card's own title/image server-side
  // for this one route so shared links preview correctly.
  app.get("/cardlogue/card/:id", async (req, res, next) => {
    try {
      const card = await getPublicMyCard(req.params.id);
      // Unknown/private card: still serve the SPA shell (its page shows the
      // not-found state) but with a real 404 so crawlers don't index it.
      if (!card) return res.status(404).sendFile(path.resolve(distPath, "index.html"));
      let html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
      // Same "ko unless the client says otherwise" default as the client's
      // own detectLang (client/src/lib/i18n.tsx) — most crawlers/browsers
      // do send Accept-Language, though some (Telegram's bot, etc.) don't.
      const isKo = (req.headers["accept-language"] || "").toLowerCase().startsWith("ko");
      const defaultTitle = isKo ? "디지털 명함" : "Digital Business Card";
      const defaultDescription = isKo ? "카드로그 디지털 명함" : "A digital business card, made with Cardlogue";
      const title = escapeHtml([card.name, card.company].filter(Boolean).join(" · ") || defaultTitle);
      const description = escapeHtml([card.company, card.title].filter(Boolean).join(" · ") || defaultDescription);
      const image = card.profile_image_url ? escapeHtml(card.profile_image_url) : "https://globalmarketradar.com/cardlogue-icon.png";
      html = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${description}" />`)
        .replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${image}" />`)
        .replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${image}" />`)
        .replace(
          "</head>",
          `<meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:type" content="profile" /></head>`,
        );
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (err) {
      return next();
    }
  });

  // Same reasoning as the card-preview route above: crawlers that don't run
  // JS (including Google's initial fetch, before it queues a render) see
  // whatever index.html ships with, and that was hardcoded to The Navy's
  // own title/description — so Google indexed this page as The Navy's
  // homepage instead of Cardlogue's, even for the Cardlogue-only subdomain
  // (server/static.ts's redirect above sends everything there to this exact
  // path). Swap in Cardlogue-specific tags server-side for this one route.
  app.get("/cardlogue", (req, res, next) => {
    try {
      return renderCardloguePage(distPath, req, res);
    } catch (err) {
      return next();
    }
  });

  app.use(express.static(distPath));

  // Fall through to the SPA shell if the file doesn't exist. Paths the client
  // router actually knows get 200; anything else gets the same shell with a
  // real 404 (the client's NotFound page still renders for people), so
  // Google doesn't flag every random URL as a soft 404. Keep CLIENT_ROUTES in
  // sync with the <Route>s in client/src/App.tsx.
  app.use("/{*path}", (req, res) => {
    // originalUrl, not req.path: under app.use("/{*path}") Express strips the
    // matched mount path, so req.path is always "/" here.
    const urlPath = req.originalUrl.split("?")[0];
    const known = CLIENT_ROUTES.some((re) => re.test(urlPath));
    res.status(known ? 200 : 404).sendFile(path.resolve(distPath, "index.html"));
  });
}
