import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getPublicMyCard } from "./mycard";

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

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

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
      if (!card) return next();
      let html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
      // Same "ko unless the client says otherwise" default as the client's
      // own detectLang (client/src/lib/i18n.tsx) — most crawlers/browsers
      // do send Accept-Language, though some (Telegram's bot, etc.) don't.
      const isKo = (req.headers["accept-language"] || "").toLowerCase().startsWith("ko");
      const defaultTitle = isKo ? "디지털 명함" : "Digital Business Card";
      const defaultDescription = isKo ? "카드로그 디지털 명함" : "A digital business card, made with Cardlogue";
      const title = escapeHtml([card.name, card.company].filter(Boolean).join(" · ") || defaultTitle);
      const description = escapeHtml([card.company, card.title].filter(Boolean).join(" · ") || defaultDescription);
      const image = card.profile_image_url ? escapeHtml(card.profile_image_url) : "https://www.globalmarketradar.com/cardlogue-icon.png";
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

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
