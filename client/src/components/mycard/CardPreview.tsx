import React, { useEffect, useState } from "react";
import QR from "qrcode";
import type { MyCard } from "@shared/mycard";

// Web port of Cardlogue's components/mycard/CardPreview.tsx (React Native).
// Ported 1:1 template-by-template rather than redesigned, so any visual
// mismatch against the app should be traceable back to a specific shim
// below, not a redesign decision. RN's View/Text/Image style props are
// already CSS-flexbox-shaped by design, which is what makes this shim
// approach viable — most style objects pass straight through unchanged.

const L = { W: 340, H: 192 };
const P = { W: 200, H: 340 };

const FS = {
  name: 17,
  company: 15,
  title: 12,
  contact: 8,
  address: 7,
};

// ── RN-primitive shims ───────────────────────────────────────────────────
function cssTransform(transform?: Array<Record<string, string | number>>): string | undefined {
  if (!transform) return undefined;
  return transform
    .map((t) => {
      const [key, val] = Object.entries(t)[0];
      return `${key}(${val})`;
    })
    .join(" ");
}

function View({ style, children }: { style?: Record<string, any>; children?: React.ReactNode }) {
  const { transform, ...rest } = style ?? {};
  const cssStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    boxSizing: "border-box",
    flexShrink: 0,
    ...rest,
  };
  const t = cssTransform(transform);
  if (t) cssStyle.transform = t;
  return <div style={cssStyle}>{children}</div>;
}

function Text({
  style,
  numberOfLines,
  children,
}: {
  style?: React.CSSProperties;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  children?: React.ReactNode;
}) {
  const truncate: React.CSSProperties =
    numberOfLines === 1
      ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
      : numberOfLines
        ? { display: "-webkit-box", WebkitLineClamp: numberOfLines, WebkitBoxOrient: "vertical", overflow: "hidden" }
        : {};
  return (
    <span style={{ display: "block", flexShrink: 0, ...truncate, ...style }}>{children}</span>
  );
}

function Image({ source, style, resizeMode }: { source: { uri: string }; style?: React.CSSProperties; resizeMode?: "cover" | "contain" }) {
  return <img src={source.uri} style={{ display: "block", objectFit: resizeMode ?? "cover", ...style }} />;
}

const absoluteFill: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

function gradientAngleDeg(start?: { x: number; y: number }, end?: { x: number; y: number }): number {
  if (!start || !end) return 135;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // CSS gradient angle is measured clockwise from "up" (12 o'clock).
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function LinearGradient({
  colors,
  start,
  end,
  style,
}: {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: React.CSSProperties;
}) {
  return <div style={{ ...style, background: `linear-gradient(${gradientAngleDeg(start, end)}deg, ${colors.join(", ")})` }} />;
}

function QRCode({ value, size, color = "#000000", backgroundColor = "#ffffff" }: { value: string; size: number; color?: string; backgroundColor?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let cancelled = false;
    QR.toString(value, { type: "svg", margin: 0, color: { dark: color, light: backgroundColor } }).then((s) => {
      if (!cancelled) setSvg(s);
    });
    return () => {
      cancelled = true;
    };
  }, [value, color, backgroundColor]);
  return <div style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ── shared field props ───────────────────────────────────────────────────
export interface CardPreviewProps {
  card: Partial<MyCard>;
  scale?: number;
  side?: "front" | "back";
}

interface TP {
  card: Partial<MyCard>;
  s: number;
  W: number;
  H: number;
  bg: string;
  ac: string;
  fc: string;
  ff: string | undefined;
  fm: number;
  lm: number;
  pm: number;
  qm: number;
  show: (f: string) => boolean;
  qr: string;
  hasBg: boolean;
  ip: boolean;
}

function fontFamily(fontType?: string) {
  if (fontType === "serif") return "serif";
  if (fontType === "mono") return "monospace";
  return undefined;
}

function QRBox({ size, qr, bg = "#fff", qm = 1 }: { size: number; qr: string; bg?: string; qm?: number }) {
  const sz = size * qm;
  return (
    <View style={{ backgroundColor: bg, padding: sz * 0.06, borderRadius: sz * 0.1 }}>
      <QRCode value={qr} size={sz} />
    </View>
  );
}

function Logo({ uri, size, s, lm = 1, color = "#9CA3AF" }: { uri?: string | null; size: number; s: number; lm?: number; color?: string }) {
  const BASE = size * 1.8;
  const sz = BASE * s * lm;
  if (uri) return <Image source={{ uri }} style={{ width: sz, height: sz }} resizeMode="contain" />;
  return (
    <View
      style={{
        width: sz,
        height: sz,
        borderRadius: 4 * s,
        borderWidth: 1.5 * s,
        borderStyle: "solid",
        borderColor: color + "55",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color + "11",
      }}
    >
      <Text style={{ fontSize: sz * 0.28, color: color + "88", fontWeight: 700, letterSpacing: -0.5 }}>LOGO</Text>
    </View>
  );
}

function Profile({ uri, size, s, color, name, pm = 1 }: { uri?: string | null; size: number; s: number; color: string; name?: string; pm?: number }) {
  const sz = size * s * pm;
  if (uri) return <Image source={{ uri }} style={{ width: sz, height: sz, borderRadius: sz / 2 }} />;
  return (
    <View
      style={{
        width: sz,
        height: sz,
        borderRadius: sz / 2,
        backgroundColor: color + "33",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5 * s,
        borderStyle: "solid",
        borderColor: color,
      }}
    >
      <Text style={{ color, fontSize: sz * 0.4, fontWeight: 700 }}>{(name ?? "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// ── 앞면 템플릿 1: 클래식 미니멀 ────────────────────────────────────────────
function T1({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const hasLogo = show("logo");
  const hasProfile = show("profile");
  const hasQR = show("qr");
  const visCount = [hasLogo, hasProfile, hasQR].filter(Boolean).length;

  const items: ("logo" | "profile" | "qr")[] = [];
  if (hasLogo) items.push("logo");
  if (hasProfile) items.push("profile");
  if (hasQR) items.push("qr");

  function RightItem({ type }: { type: "logo" | "profile" | "qr" }) {
    if (type === "logo") return <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />;
    if (type === "profile") return <Profile uri={card.profile_image_url} size={38} s={s} color={ac} name={card.name} pm={pm} />;
    return <QRBox size={46 * s} qr={qr} qm={qm} />;
  }

  if (ip) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 22 * s, flexDirection: "column" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ alignItems: "center" }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 18 * s * fm, fontWeight: 800, color: fc, fontFamily: fontFam, letterSpacing: -0.5, textAlign: "center" }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            {show("company") && card.company ? (
              <Text style={{ fontSize: FS.company * s * fm, color: ac, fontFamily: fontFam, textAlign: "center", marginTop: 3 * s }}>{card.company}</Text>
            ) : null}
            {show("title") && card.title ? (
              <Text style={{ fontSize: FS.title * s * fm, fontWeight: 600, color: ac, fontFamily: fontFam, textAlign: "center" }}>{card.title}</Text>
            ) : null}
          </View>
          <View style={{ gap: 3 * s, alignItems: "center", marginTop: 6 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
            ) : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
            ) : null}
          </View>
          {visCount === 1 && (
            <View style={{ marginTop: 20 * s }}>
              <RightItem type={items[0]} />
            </View>
          )}
          {visCount === 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 * s, width: "100%", marginTop: 20 * s }}>
              {items.map((type) => (
                <RightItem key={type} type={type} />
              ))}
            </View>
          )}
        </View>
        {visCount === 3 && (
          <View style={{ alignItems: "center", marginTop: 20 * s }}>
            <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 * s, marginTop: 12 * s }}>
              <Profile uri={card.profile_image_url} size={34} s={s} color={ac} name={card.name} pm={pm} />
              <QRBox size={42 * s} qr={qr} qm={qm} />
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, paddingTop: 22 * s, paddingBottom: 22 * s, paddingLeft: 28 * s, paddingRight: 16 * s, flexDirection: "row" }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingRight: 10 * s }}>
        <View>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 18 * s * fm, fontWeight: 800, color: fc, fontFamily: fontFam, letterSpacing: -0.5 }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, color: ac, fontFamily: fontFam, marginTop: 3 * s }}>{card.company}</Text> : null}
          {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, fontWeight: 600, color: ac, fontFamily: fontFam }}>{card.title}</Text> : null}
        </View>
        <View style={{ gap: 3 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
      </View>

      {visCount === 1 && (
        <View style={{ position: "absolute", right: W * 0.22, top: 0, bottom: 0, justifyContent: "center" }}>
          <RightItem type={items[0]} />
        </View>
      )}
      {visCount === 2 && (
        <View style={{ width: 64 * s, alignItems: "center", justifyContent: "space-between", paddingTop: 2 * s, paddingBottom: 2 * s }}>
          {items.map((type) => (
            <RightItem key={type} type={type} />
          ))}
        </View>
      )}

      {visCount === 3 && (
        <>
          <View style={{ position: "absolute", top: 22 * s, right: 26 * s }}>
            <Profile uri={card.profile_image_url} size={34} s={s} color={ac} name={card.name} pm={pm} />
          </View>
          <View style={{ ...absoluteFill, alignItems: "center", justifyContent: "center" }}>
            <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
          </View>
          <View style={{ position: "absolute", bottom: 22 * s, right: 26 * s }}>
            <QRBox size={42 * s} qr={qr} qm={qm} />
          </View>
        </>
      )}
    </View>
  );
}

// ── 앞면 템플릿 2: 좌측 컬러 사이드바 ──────────────────────────────────────
function T2({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const topItem = showLogo ? "logo" : showProfile ? "profile" : showQR ? "qr" : null;
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;
  const sidebarProfile = showProfile && (showLogo || activeCount === 3);
  const sidebarQR = showQR && activeCount >= 2;

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
      {!ip && topItem && (
        <View style={{ ...absoluteFill, justifyContent: "center", alignItems: "center", paddingLeft: W * 0.55 }}>
          {topItem === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          {topItem === "profile" && <Profile uri={card.profile_image_url} size={38} s={s} color={ac} name={card.name} pm={pm} />}
          {topItem === "qr" && <QRBox size={36 * s} qr={qr} qm={qm} />}
        </View>
      )}
      <View style={{ width: 60 * s, backgroundColor: ac, alignItems: "center", justifyContent: "center", gap: ip ? 110 * s : 30 * s }}>
        {sidebarProfile && <Profile uri={card.profile_image_url} size={38} s={s} color="#fff" name={card.name} pm={pm} />}
        {sidebarQR && <QRBox size={36 * s} qr={qr} bg="rgba(255,255,255,0.15)" qm={qm} />}
      </View>
      {ip ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 12 * s }}>
          <View style={{ alignItems: "center", gap: 2 * s }}>
            {topItem === "logo" && (
              <View style={{ marginBottom: 50 * s }}>
                <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
              </View>
            )}
            {topItem === "profile" && (
              <View style={{ marginBottom: 50 * s }}>
                <Profile uri={card.profile_image_url} size={38} s={s} color={ac} name={card.name} pm={pm} />
              </View>
            )}
            {topItem === "qr" && (
              <View style={{ marginBottom: 50 * s }}>
                <QRBox size={36 * s} qr={qr} qm={qm} />
              </View>
            )}
            {show("name") && card.name ? <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.name}</Text> : null}
            {show("company") && card.company ? (
              <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>{card.company}</Text>
            ) : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.title}</Text> : null}
            {show("phone") && card.phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, marginTop: 6 * s, textAlign: "center" }}>{card.phone}</Text>
            ) : null}
            {show("company_phone") && card.company_phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
            ) : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 18 * s, justifyContent: "center" }}>
          <View>
            <View style={{ height: 6 * s }} />
            {show("name") && card.name ? (
              <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam, marginTop: 2 * s }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
          <View style={{ gap: 2 * s, marginTop: 8 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
        </View>
      )}
    </View>
  );
}

// ── 앞면 템플릿 3: 상단 헤더 ────────────────────────────────────────────────
function T3({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;

  if (!ip && activeCount === 0) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, gap: 6 * s, alignItems: "center" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: W * 0.1 }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 22 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: W * 0.08 }}>
            {show("company") && card.company ? (
              <Text style={{ fontSize: 15 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.company}
              </Text>
            ) : null}
            {show("title") && card.title ? (
              <Text style={{ fontSize: 12 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam, marginTop: 2 * s }} numberOfLines={1}>
                {card.title}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, paddingTop: 10 * s, gap: 6 * s }}>
          <View style={{ flex: 1, gap: 4 * s, paddingLeft: W * 0.1, marginTop: 10 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>{card.email}</Text> : null}
          </View>
          <View style={{ flex: 1, gap: 4 * s, alignItems: "flex-end", paddingRight: W * 0.08, marginTop: 10 * s }}>
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "right" }}>{card.address}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  const itemType = showLogo ? "logo" : showProfile ? "profile" : showQR ? "qr" : null;

  const BottomSection1 = (
    <>
      <View style={{ height: 2 * s, backgroundColor: ac }} />
      <View style={{ flex: 1, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, paddingTop: 10 * s, gap: 6 * s }}>
        <View style={{ flex: 1, gap: 4 * s, paddingLeft: W * 0.1, marginTop: 10 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>{card.email}</Text> : null}
        </View>
        <View style={{ flex: 1, gap: 4 * s, alignItems: "flex-end", paddingRight: W * 0.08, marginTop: 10 * s }}>
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "right" }}>{card.address}</Text>
          ) : null}
        </View>
      </View>
    </>
  );

  if (!ip && activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, gap: 6 * s, alignItems: "center" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: W * 0.1 }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 22 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 15 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 15 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 15 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: W * 0.04 }}>
            <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, flexDirection: "row", paddingTop: 10 * s }}>
          <View style={{ width: W * 0.3, paddingLeft: W * 0.27, justifyContent: "center", marginTop: -8 * s, flexDirection: "row", gap: 14 * s, alignItems: "center" }}>
            <Profile uri={card.profile_image_url} size={36} s={s} color={ac} name={card.name} pm={pm} />
            <QRBox size={34 * s} qr={qr} qm={qm} />
          </View>
          <View style={{ flex: 1, paddingRight: W * 0.06, paddingLeft: W * 0.3, justifyContent: "space-between", paddingBottom: 8 * s }}>
            {show("phone") && card.phone ? (
              <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                {card.phone}
              </Text>
            ) : null}
            {show("email") && card.email ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                {card.email}
              </Text>
            ) : null}
            {show("company_phone") && card.company_phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                T. {card.company_phone}
              </Text>
            ) : null}
            {show("fax") && card.fax ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                F. {card.fax}
              </Text>
            ) : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam }} numberOfLines={1}>
                {card.address}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  if (!ip && activeCount === 2) {
    const item1 = showLogo ? "logo" : showProfile ? "profile" : "qr";
    const item2 = showLogo && showProfile ? "profile" : showLogo && showQR ? "qr" : "qr";
    const Item = ({ type }: { type: string }) => {
      if (type === "logo") return <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />;
      if (type === "profile") return <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />;
      return <QRBox size={44 * s} qr={qr} qm={qm} />;
    };
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, gap: 6 * s, alignItems: "center" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: W * 0.1 }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 22 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 15 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 15 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 15 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: W * 0.04 }}>
            <Item type={item1} />
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, flexDirection: "row", paddingTop: 10 * s }}>
          <View style={{ width: W * 0.3, paddingLeft: W * 0.18, justifyContent: "center", marginTop: -8 * s }}>
            <Item type={item2} />
          </View>
          <View style={{ flex: 1, paddingRight: W * 0.06, paddingLeft: W * 0.3, justifyContent: "space-between", paddingBottom: 8 * s }}>
            {show("phone") && card.phone ? (
              <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                {card.phone}
              </Text>
            ) : null}
            {show("email") && card.email ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                {card.email}
              </Text>
            ) : null}
            {show("company_phone") && card.company_phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                T. {card.company_phone}
              </Text>
            ) : null}
            {show("fax") && card.fax ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }} numberOfLines={1}>
                F. {card.fax}
              </Text>
            ) : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam }} numberOfLines={1}>
                {card.address}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  if (!ip && activeCount === 1) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, flexDirection: "row", paddingLeft: W * 0.08, paddingRight: W * 0.08, gap: 6 * s, alignItems: "center" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: W * 0.1 }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 22 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 15 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 15 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 15 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: W * 0.04 }}>
            {itemType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
            {itemType === "profile" && <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />}
            {itemType === "qr" && <QRBox size={44 * s} qr={qr} qm={qm} />}
          </View>
        </View>
        {BottomSection1}
      </View>
    );
  }

  if (ip && activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, alignItems: "center", justifyContent: "center", paddingLeft: 20 * s, paddingRight: 20 * s, gap: 10 * s }}>
          <View style={{ flexDirection: "row", gap: 30 * s, alignItems: "center" }}>
            <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
            <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
          </View>
          <View style={{ alignItems: "center" }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 11 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 11 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 10 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 * s, paddingLeft: 20 * s, paddingRight: 20 * s, paddingBottom: 8 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? (
            <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
          ) : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
          ) : null}
          <View style={{ marginTop: 8 * s }}>
            <QRBox size={44 * s} qr={qr} qm={qm} />
          </View>
        </View>
      </View>
    );
  }

  if (ip && activeCount === 2) {
    const item1 = showLogo ? "logo" : showProfile ? "profile" : "qr";
    const item2 = showLogo && showProfile ? "profile" : showLogo && showQR ? "qr" : "qr";
    const Item2 = ({ type }: { type: string }) => {
      if (type === "logo") return <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />;
      if (type === "profile") return <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />;
      return <QRBox size={44 * s} qr={qr} qm={qm} />;
    };
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, alignItems: "center", justifyContent: "center", paddingLeft: 20 * s, paddingRight: 20 * s, gap: 10 * s }}>
          <View style={{ flexDirection: "row", gap: 30 * s, alignItems: "center" }}>
            <Item2 type={item1} />
            <Item2 type={item2} />
          </View>
          <View style={{ alignItems: "center" }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 11 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 11 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 10 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 * s, paddingLeft: 20 * s, paddingRight: 20 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? (
            <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
          ) : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (ip && activeCount === 1) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, alignItems: "center", justifyContent: "center", paddingLeft: 20 * s, paddingRight: 20 * s, gap: 10 * s }}>
          {itemType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          {itemType === "profile" && <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />}
          {itemType === "qr" && <QRBox size={44 * s} qr={qr} qm={qm} />}
          <View style={{ alignItems: "center" }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: 11 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.company}
                </Text>
              ) : null}
              {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 11 * s * fm, color: fc }}>·</Text> : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: 10 * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 * s, paddingLeft: 20 * s, paddingRight: 20 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? (
            <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
          ) : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (ip && activeCount === 0) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
        <View style={{ height: H * 0.5, backgroundColor: bg, alignItems: "center", justifyContent: "center", paddingLeft: 20 * s, paddingRight: 20 * s }}>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 26 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {show("company") && card.company ? (
            <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginTop: 4 * s, textAlign: "center" }}>{card.company}</Text>
          ) : null}
          {show("title") && card.title ? (
            <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>{card.title}</Text>
          ) : null}
        </View>
        <View style={{ height: 2 * s, backgroundColor: ac }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 * s, paddingLeft: 20 * s, paddingRight: 20 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? (
            <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
          ) : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : "#fff", overflow: "hidden" }}>
      <View style={{ height: H * 0.5, backgroundColor: bg, paddingLeft: 18 * s, paddingRight: 18 * s, paddingTop: 14 * s, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          {showLogo && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          <View style={{ height: 6 * s }} />
          {show("name") && card.name ? (
            <Text style={{ fontSize: 22 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 4 * s, marginTop: 2 * s }}>
            {show("company") && card.company ? <Text style={{ fontSize: 11 * s * fm, color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("company") && card.company && show("title") && card.title ? <Text style={{ fontSize: 11 * s * fm, color: ac }}>·</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: 11 * s * fm, color: ac, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
        </View>
        {showProfile && <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />}
      </View>
      <View style={{ height: 2 * s, backgroundColor: ac }} />
      <View style={{ flex: 1, paddingLeft: 18 * s, paddingRight: 18 * s, paddingTop: 10 * s, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ gap: 4 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#374151", fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#6B7280", fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
        {showQR && <QRBox size={44 * s} qr={qr} qm={qm} />}
      </View>
    </View>
  );
}

// ── 앞면 템플릿 4: 우측 프로필 분할 ────────────────────────────────────────
function T4({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;
  const itemType = showLogo ? "logo" : showProfile ? "profile" : "qr";

  const ContactTexts = () => (
    <View style={{ gap: 3 * s, alignItems: "center" }}>
      {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text> : null}
      {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
      {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
      {show("address") && card.address ? (
        <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
      ) : null}
    </View>
  );

  const LeftPanel = () => (
    <View style={{ flex: 1, paddingTop: 18 * s, paddingBottom: 18 * s, paddingLeft: 30 * s, paddingRight: 18 * s, justifyContent: "space-between" }}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, marginLeft: W * 0.15 }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 6 * s, marginTop: 3 * s, marginLeft: W * 0.11, alignItems: "flex-end" }}>
          {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
          {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
        </View>
        {show("phone") && card.phone ? (
          <Text style={{ fontSize: 15 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginLeft: W * 0.08, marginTop: 6 * s }}>{card.phone}</Text>
        ) : null}
      </View>
    </View>
  );

  const logoProfileOnly = showLogo && showProfile && !showQR;
  const item1 = logoProfileOnly ? "logo" : showQR ? "qr" : showProfile ? "profile" : "logo";
  const item2 = logoProfileOnly ? "profile" : showLogo ? "logo" : "profile";

  function PanelItem({ type, color = "#fff" }: { type: string; color?: string }) {
    if (type === "logo") return <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={color} />;
    if (type === "profile") return <Profile uri={card.profile_image_url} size={52} s={s} color={color} name={card.name} pm={pm} />;
    return <QRBox size={38 * s} qr={qr} qm={qm} />;
  }

  if (ip) {
    if (activeCount === 0) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: 20 * s, paddingTop: 18 * s, paddingBottom: 18 * s, gap: 4 * s }}>
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
            {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginTop: 4 * s }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          <View style={{ width: W * 0.3, backgroundColor: ac, alignItems: "center", justifyContent: "center", paddingTop: 14 * s, paddingBottom: 14 * s }}>
            {show("name") && card.name ? (
              <View style={{ alignItems: "center", gap: 2 * s }}>
                {card.name.split("").map((char, i) => (
                  <Text key={i} style={{ fontSize: 16 * s * fm, fontWeight: "800", color: "#fff", fontFamily: fontFam }}>
                    {char}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    }
    if (activeCount === 1) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: 20 * s, paddingTop: 18 * s, paddingBottom: 18 * s, gap: 4 * s }}>
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
            {show("phone") && card.phone ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginTop: 4 * s }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
            <View style={{ alignItems: "center", marginTop: 18 * s, marginLeft: -14 * s }}>
              <PanelItem type={itemType} color={ac} />
            </View>
          </View>
          <View style={{ width: W * 0.3, backgroundColor: ac, alignItems: "center", justifyContent: "center", paddingTop: 14 * s, paddingBottom: 14 * s }}>
            {show("name") && card.name ? (
              <View style={{ alignItems: "center", gap: 2 * s }}>
                {card.name.split("").map((char, i) => (
                  <Text key={i} style={{ fontSize: 16 * s * fm, fontWeight: "800", color: "#fff", fontFamily: fontFam }}>
                    {char}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    }
    if (activeCount === 2) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
          <View style={{ flex: 1, justifyContent: "space-between", alignItems: "center", paddingTop: 24 * s, paddingBottom: 24 * s }}>
            <View style={{ alignItems: "center" }}>
              <PanelItem type={item2} color={ac} />
            </View>
            <View style={{ alignItems: "center", gap: 4 * s }}>
              {show("company") && card.company ? (
                <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam, textAlign: "center" }}>{card.company}</Text>
              ) : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.title}</Text>
              ) : null}
              {show("phone") && card.phone ? (
                <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, textAlign: "center", marginTop: 4 * s }}>{card.phone}</Text>
              ) : null}
              {show("company_phone") && card.company_phone ? (
                <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
              ) : null}
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
              {show("address") && card.address ? (
                <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: "center" }}>
              <PanelItem type={item1} color={ac} />
            </View>
          </View>
          <View style={{ width: W * 0.3, backgroundColor: ac, alignItems: "center", justifyContent: "center", paddingTop: 14 * s, paddingBottom: 14 * s }}>
            {show("name") && card.name ? (
              <View style={{ alignItems: "center", gap: 2 * s }}>
                {card.name.split("").map((char, i) => (
                  <Text key={i} style={{ fontSize: 16 * s * fm, fontWeight: "800", color: "#fff", fontFamily: fontFam }}>
                    {char}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    }
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
        <View style={{ flex: 1, justifyContent: "space-between", alignItems: "center", paddingTop: 24 * s, paddingBottom: 24 * s }}>
          <View style={{ alignItems: "center" }}>
            <PanelItem type="logo" color={ac} />
          </View>
          <View style={{ alignItems: "center", gap: 4 * s }}>
            {show("company") && card.company ? (
              <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam, textAlign: "center" }}>{card.company}</Text>
            ) : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.title}</Text> : null}
            {show("phone") && card.phone ? (
              <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, textAlign: "center", marginTop: 4 * s }}>{card.phone}</Text>
            ) : null}
            {show("company_phone") && card.company_phone ? (
              <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>T. {card.company_phone}</Text>
            ) : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam, textAlign: "center" }}>{card.email}</Text> : null}
            {show("address") && card.address ? (
              <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "center" }}>
            <PanelItem type="profile" color={ac} />
          </View>
        </View>
        <View style={{ width: W * 0.3, backgroundColor: ac, alignItems: "center", justifyContent: "center", paddingTop: 14 * s, paddingBottom: 14 * s, gap: 32 * s }}>
          {show("name") && card.name ? (
            <View style={{ alignItems: "center", gap: 2 * s }}>
              {card.name.split("").map((char, i) => (
                <Text key={i} style={{ fontSize: 16 * s * fm, fontWeight: "800", color: "#fff", fontFamily: fontFam }}>
                  {char}
                </Text>
              ))}
            </View>
          ) : null}
          <QRBox size={38 * s} qr={qr} qm={qm} />
        </View>
      </View>
    );
  }

  if (activeCount === 0) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
        <LeftPanel />
        <View style={{ width: W * 0.3, backgroundColor: ac, alignItems: "center", justifyContent: "center", paddingTop: 14 * s, paddingBottom: 14 * s, paddingLeft: 6 * s, paddingRight: 6 * s }}>
          <ContactTexts />
        </View>
      </View>
    );
  }

  if (activeCount === 1) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
        <LeftPanel />
        <View
          style={{
            width: W * 0.3,
            backgroundColor: ac,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 14 * s,
            paddingBottom: 14 * s,
            paddingLeft: 6 * s,
            paddingRight: 6 * s,
            gap: 10 * s,
          }}
        >
          <PanelItem type={item1} />
          <ContactTexts />
        </View>
      </View>
    );
  }

  if (activeCount === 2) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
        <View style={{ flex: 1, paddingTop: 18 * s, paddingBottom: 18 * s, paddingRight: 18 * s, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }}>
          <View style={{ justifyContent: "center", alignItems: "center", paddingLeft: 26 * s }}>
            <PanelItem type={item2} color={ac} />
          </View>
          <View style={{ flex: 1, justifyContent: "center", paddingLeft: 10 * s }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 14 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, marginLeft: W * 0.1 }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 6 * s, marginTop: 3 * s, alignItems: "flex-end", marginLeft: W * 0.07 }}>
              {show("company") && card.company ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
              {show("title") && card.title ? <Text style={{ fontSize: 10 * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
            </View>
            {show("phone") && card.phone ? (
              <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginTop: 6 * s, marginLeft: W * 0.04 }}>{card.phone}</Text>
            ) : null}
          </View>
        </View>
        <View
          style={{
            width: W * 0.3,
            backgroundColor: ac,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 14 * s,
            paddingBottom: 14 * s,
            paddingLeft: 6 * s,
            paddingRight: 6 * s,
            gap: 10 * s,
          }}
        >
          <PanelItem type={item1} />
          <ContactTexts />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, flexDirection: "row", overflow: "hidden" }}>
      <View style={{ flex: 1, paddingTop: 18 * s, paddingBottom: 18 * s, paddingRight: 18 * s, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }}>
        <View style={{ justifyContent: "center", alignItems: "center", paddingLeft: 26 * s, gap: 8 * s }}>
          <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
          <Profile uri={card.profile_image_url} size={52} s={s} color={ac} name={card.name} pm={pm} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", paddingLeft: 10 * s }}>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 14 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, marginLeft: W * 0.1 }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 6 * s, marginTop: 3 * s, alignItems: "flex-end", marginLeft: W * 0.07 }}>
            {show("company") && card.company ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: 10 * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
          {show("phone") && card.phone ? (
            <Text style={{ fontSize: 12 * s * fm, fontWeight: "700", color: fc, fontFamily: fontFam, marginTop: 6 * s, marginLeft: W * 0.04 }}>{card.phone}</Text>
          ) : null}
        </View>
      </View>
      <View
        style={{
          width: W * 0.3,
          backgroundColor: ac,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 14 * s,
          paddingBottom: 14 * s,
          paddingLeft: 6 * s,
          paddingRight: 6 * s,
          gap: 10 * s,
        }}
      >
        <QRBox size={38 * s} qr={qr} bg="rgba(255,255,255,0.2)" qm={qm} />
        <ContactTexts />
      </View>
    </View>
  );
}

// ── 앞면 템플릿 5: 센터 포커스 ──────────────────────────────────────────────
function T5({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;
  const itemType = showLogo ? "logo" : showProfile ? "profile" : "qr";

  const ContactBlock = () => (
    <>
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
      </View>
      {show("address") && card.address ? (
        <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
      ) : null}
    </>
  );

  if (!ip && activeCount === 2) {
    const itemA = showLogo ? "logo" : showProfile ? "profile" : "qr";
    const itemB = showLogo && showProfile ? "profile" : showLogo && showQR ? "qr" : "qr";
    const SideItem = ({ type }: { type: string }) => {
      if (type === "logo") return <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />;
      if (type === "profile") return <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />;
      return <QRBox size={36 * s} qr={qr} qm={qm} />;
    };
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", left: W * 0.06, top: 0, bottom: 0, width: W * 0.2, justifyContent: "center", alignItems: "center" }}>
          <SideItem type={itemA} />
        </View>
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {(show("company") && card.company) || (show("title") && card.title) ? (
          <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>
            {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <View style={{ height: 1 * s, width: 60 * s, backgroundColor: ac, opacity: 0.5, marginTop: 8 * s, marginBottom: 8 * s }} />
        <ContactBlock />
        <View style={{ position: "absolute", right: W * 0.06, top: 0, bottom: 0, width: W * 0.2, justifyContent: "center", alignItems: "center" }}>
          <SideItem type={itemB} />
        </View>
      </View>
    );
  }

  if (!ip && activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", left: W * 0.06, top: 0, bottom: 0, width: W * 0.2, justifyContent: "center", alignItems: "center", paddingTop: 30 * s }}>
          <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
        </View>
        <View style={{ alignItems: "center", marginBottom: 8 * s }}>
          <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />
        </View>
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {(show("company") && card.company) || (show("title") && card.title) ? (
          <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>
            {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <View style={{ height: 1 * s, width: 60 * s, backgroundColor: ac, opacity: 0.5, marginTop: 8 * s, marginBottom: 8 * s }} />
        <ContactBlock />
        <View style={{ position: "absolute", right: W * 0.06, top: 0, bottom: 0, width: W * 0.2, justifyContent: "center", alignItems: "center", paddingTop: 30 * s }}>
          <QRBox size={36 * s} qr={qr} qm={qm} />
        </View>
      </View>
    );
  }

  if (!ip && activeCount === 1) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 8 * s }}>
          {itemType === "logo" && <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />}
          {itemType === "profile" && <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />}
          {itemType === "qr" && <QRBox size={36 * s} qr={qr} qm={qm} />}
        </View>
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {(show("company") && card.company) || (show("title") && card.title) ? (
          <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>
            {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <View style={{ height: 1 * s, width: 60 * s, backgroundColor: ac, opacity: 0.5, marginTop: 8 * s, marginBottom: 8 * s }} />
        <ContactBlock />
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
      {show("profile") && (
        <View style={{ marginBottom: 8 * s }}>
          <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
        </View>
      )}
      {show("name") && card.name ? (
        <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
          {card.name}
        </Text>
      ) : null}
      {(show("company") && card.company) || (show("title") && card.title) ? (
        <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>
          {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      <View style={{ height: 1 * s, width: 60 * s, backgroundColor: ac, opacity: 0.5, marginTop: 8 * s, marginBottom: 8 * s }} />
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
      </View>
      {show("address") && card.address ? (
        <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
      ) : null}
      <View style={{ position: "absolute", bottom: 12 * s, left: 14 * s }}>{show("qr") && <QRBox size={36 * s} qr={qr} qm={qm} />}</View>
      <View style={{ position: "absolute", bottom: 12 * s, right: 14 * s }}>{show("logo") && <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />}</View>
    </View>
  );
}

// ── 앞면 템플릿 5 세로형 ─────────────────────────────────────────────────────
function T5P({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;
  const itemType = showLogo ? "logo" : showProfile ? "profile" : "qr";

  const TextBlock = () => (
    <>
      {show("name") && card.name ? (
        <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, textAlign: "center" }} numberOfLines={1}>
          {card.name}
        </Text>
      ) : null}
      {(show("company") && card.company) || (show("title") && card.title) ? (
        <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, fontFamily: fontFam, marginTop: 2 * s, textAlign: "center" }}>
          {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      <View style={{ height: 1 * s, width: 60 * s, backgroundColor: ac, opacity: 0.5, marginTop: 8 * s, marginBottom: 8 * s }} />
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 16 * s, marginBottom: 4 * s }}>
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
      </View>
      {show("address") && card.address ? (
        <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, textAlign: "center" }}>{card.address}</Text>
      ) : null}
    </>
  );

  if (activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 6 * s }}>
          <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
        </View>
        <TextBlock />
        <View style={{ alignItems: "center", marginTop: 6 * s }}>
          <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />
        </View>
        <View style={{ alignItems: "center", marginTop: 6 * s }}>
          <QRBox size={36 * s} qr={qr} qm={qm} />
        </View>
      </View>
    );
  }

  if (activeCount === 2) {
    const topItem = showProfile ? "profile" : "logo";
    const bottomItem = showQR ? "qr" : "logo";
    const Item2 = ({ type }: { type: string }) => {
      if (type === "logo")
        return (
          <View style={{ alignItems: "center" }}>
            <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />
          </View>
        );
      if (type === "profile")
        return (
          <View style={{ alignItems: "center" }}>
            <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
          </View>
        );
      return (
        <View style={{ alignItems: "center" }}>
          <QRBox size={36 * s} qr={qr} qm={qm} />
        </View>
      );
    };
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 12 * s }}>
          <Item2 type={topItem} />
        </View>
        <TextBlock />
        <View style={{ alignItems: "center", marginTop: 12 * s }}>
          <Item2 type={bottomItem} />
        </View>
      </View>
    );
  }

  if (activeCount === 1) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 8 * s }}>
          {itemType === "logo" && <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />}
          {itemType === "profile" && <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />}
          {itemType === "qr" && <QRBox size={36 * s} qr={qr} qm={qm} />}
        </View>
        <TextBlock />
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s, alignItems: "center", justifyContent: "center" }}>
      <TextBlock />
    </View>
  );
}

// ── 앞면 템플릿 6: 하단 컬러 푸터 ──────────────────────────────────────────
function T6({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const showLogo = show("logo");
  const showProfile = show("profile");
  const showQR = show("qr");
  const activeCount = [showLogo, showProfile, showQR].filter(Boolean).length;
  const itemType = showLogo ? "logo" : showProfile ? "profile" : "qr";

  const item1 = showProfile ? "profile" : showLogo ? "logo" : "qr";
  const item2 = showProfile ? (showQR ? "qr" : "logo") : showQR ? "qr" : "logo";

  const TopSection = ({ hideLogo = false, hideProfile = false }: { hideLogo?: boolean; hideProfile?: boolean }) => (
    <View style={{ flex: 1, paddingLeft: 30 * s, paddingRight: 20 * s, paddingTop: 26 * s, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
      <View style={{ flex: 1 }}>
        {!hideLogo && show("logo") && (
          <View style={{ alignItems: "center", width: 52 * s * lm }}>
            <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
          </View>
        )}
        <View style={{ height: 8 * s }} />
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, marginTop: 2 * s }}>{card.title}</Text> : null}
        {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
      </View>
      {!hideProfile && show("profile") && (
        <View style={{ alignItems: "center", width: 50 * s * pm }}>
          <Profile uri={card.profile_image_url} size={50} s={s} color={ac} name={card.name} pm={pm} />
        </View>
      )}
    </View>
  );

  const BottomSection = () => {
    const floatType = activeCount === 2 ? item2 : itemType;
    return (
      <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 2 * s }}>
          <View style={{ flexDirection: "row", gap: 10 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          </View>
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
        {activeCount > 0 ? (
          <View style={{ width: 60 * s, height: 60 * s, alignItems: "center", justifyContent: "center" }}>
            {floatType === "qr" ? (
              <QRBox size={36 * s} qr={qr} qm={qm} />
            ) : floatType === "logo" ? (
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color="#fff" />
            ) : (
              <Profile uri={card.profile_image_url} size={40} s={s} color="#fff" name={card.name} pm={pm} />
            )}
          </View>
        ) : null}
      </View>
    );
  };

  function FloatItem({ type }: { type: string }) {
    if (type === "logo") return <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />;
    if (type === "profile") return <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />;
    return <QRBox size={36 * s} qr={qr} qm={qm} />;
  }

  if (ip) {
    if (activeCount === 0) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
          <View style={{ flex: 1 }} />
          <View style={{ paddingLeft: 20 * s, paddingRight: 20 * s, paddingBottom: 12 * s }}>
            {show("name") && card.name ? <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, marginTop: 2 * s }}>{card.title}</Text> : null}
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
          </View>
          <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 12 * s, paddingBottom: 12 * s, justifyContent: "center" }}>
            <View style={{ gap: 3 * s }}>
              <View style={{ flexDirection: "row", gap: 10 * s }}>
                {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
                {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              </View>
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
          </View>
        </View>
      );
    }

    if (activeCount === 3) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 * s }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <FloatItem type="logo" />
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <FloatItem type="profile" />
            </View>
          </View>
          <View style={{ paddingLeft: 20 * s, paddingRight: 20 * s, paddingBottom: 12 * s, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              {show("name") && card.name ? <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
              {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, marginTop: 2 * s }}>{card.title}</Text> : null}
              {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <QRBox size={36 * s} qr={qr} qm={qm} />
            </View>
          </View>
          <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 12 * s, paddingBottom: 12 * s, justifyContent: "center" }}>
            <View style={{ gap: 3 * s }}>
              <View style={{ flexDirection: "row", gap: 10 * s }}>
                {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
                {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              </View>
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
          </View>
        </View>
      );
    }

    if (activeCount === 2) {
      const leftItem = showQR ? (showProfile ? "profile" : "logo") : item2;
      const rightItem = showQR ? "qr" : item1;
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 * s }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <FloatItem type={leftItem} />
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <FloatItem type={rightItem} />
            </View>
          </View>
          <View style={{ paddingLeft: 20 * s, paddingRight: 20 * s, paddingBottom: 12 * s }}>
            {show("name") && card.name ? <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, marginTop: 2 * s }}>{card.title}</Text> : null}
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
          </View>
          <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 12 * s, paddingBottom: 12 * s, justifyContent: "center" }}>
            <View style={{ gap: 3 * s }}>
              <View style={{ flexDirection: "row", gap: 10 * s }}>
                {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
                {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              </View>
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
          </View>
        </View>
      );
    }

    if (activeCount === 1) {
      return (
        <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <FloatItem type={itemType} />
          </View>
          <View style={{ paddingLeft: 20 * s, paddingRight: 20 * s, paddingBottom: 12 * s }}>
            {show("name") && card.name ? <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam, marginTop: 2 * s }}>{card.title}</Text> : null}
            {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
          </View>
          <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 12 * s, paddingBottom: 12 * s, justifyContent: "center" }}>
            <View style={{ gap: 3 * s }}>
              <View style={{ flexDirection: "row", gap: 10 * s }}>
                {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
                {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              </View>
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
        <TopSection />
        <BottomSection />
      </View>
    );
  }

  if (activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12 * s, backgroundColor: ac }} />
        <View
          style={{
            position: "absolute",
            left: W * 0.52,
            top: 0,
            bottom: H * 0.32,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            gap: 16 * s,
            width: W * 0.46,
          }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Profile uri={card.profile_image_url} size={46} s={s} color={ac} name={card.name} pm={pm} />
          </View>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
          </View>
        </View>
        <TopSection hideLogo hideProfile />
        <View style={{ height: H * 0.32, backgroundColor: ac, paddingLeft: 16 * s, paddingRight: 16 * s, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 * s }}>
            <View style={{ flexDirection: "row", gap: 10 * s }}>
              {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.phone}</Text> : null}
              {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            </View>
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: "#fff", fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: "#fff", opacity: 0.8, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          <View style={{ width: 60 * s, height: 60 * s, alignItems: "center", justifyContent: "center" }}>
            <QRBox size={36 * s} qr={qr} qm={qm} />
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 2) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12 * s, backgroundColor: ac }} />
        <View style={{ position: "absolute", left: W * 0.65, top: 0, bottom: H * 0.32, justifyContent: "center", alignItems: "center", width: W * 0.25 }}>
          <FloatItem type={item1} />
        </View>
        <TopSection hideLogo hideProfile />
        <BottomSection />
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12 * s, backgroundColor: ac }} />
      <TopSection hideLogo={activeCount === 1 && itemType === "logo"} hideProfile={activeCount === 1 && itemType === "profile"} />
      <BottomSection />
    </View>
  );
}

// ── 앞면 템플릿 7: 테두리 프레임 ────────────────────────────────────────────
function T7({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const activeCount = [show("logo"), show("profile"), show("qr")].filter(Boolean).length;

  if (!ip) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
        <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s }}>
          {activeCount === 3 ? (
            <View style={{ position: "absolute", right: 12 * s, top: 10 * s, flexDirection: "row", alignItems: "center", gap: 8 * s }}>
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
              </View>
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />
              </View>
            </View>
          ) : show("profile") ? (
            <View style={{ position: "absolute", right: 12 * s, top: 10 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />
            </View>
          ) : show("logo") ? (
            <View style={{ position: "absolute", right: 12 * s, top: 10 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
            </View>
          ) : null}
          {show("name") && card.name ? (
            <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam, marginLeft: 10 * s }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {(show("company") && card.company) || (show("title") && card.title) ? (
            <Text style={{ fontSize: FS.company * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam }}>
              {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ gap: 2 * s }}>
              {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
              {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
            {(show("qr") || (show("logo") && show("profile"))) && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center", marginTop: 8 * s }}>
                {show("qr") && <QRBox size={44 * s} qr={qr} qm={qm} />}
                {!show("qr") && show("logo") && show("profile") && <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 3) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
        <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s, paddingTop: 20 * s }}>
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />
          </View>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {(show("company") && card.company) || (show("title") && card.title) ? (
            <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam, paddingRight: 58 * s }}>
              {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 * s, marginTop: 50 * s }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <QRBox size={44 * s} qr={qr} qm={qm} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 2) {
    const topType = show("profile") ? "profile" : "logo";
    const bottomType = show("qr") ? "qr" : "logo";
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
        <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s, paddingTop: 20 * s }}>
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            {topType === "profile" && <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />}
            {topType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {(show("company") && card.company) || (show("title") && card.title) ? (
            <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam, paddingRight: 58 * s }}>
              {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          <View style={{ alignItems: "center", marginTop: 50 * s }}>
            {bottomType === "qr" && <QRBox size={44 * s} qr={qr} qm={qm} />}
            {bottomType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 1 && show("qr") && !show("logo") && !show("profile")) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
        <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s, paddingTop: 20 * s }}>
          <View style={{ marginBottom: 8 * s }} />
          {show("name") && card.name ? (
            <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {(show("company") && card.company) || (show("title") && card.title) ? (
            <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam }}>
              {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          <View style={{ alignItems: "center", marginTop: 40 * s }}>
            <QRBox size={44 * s} qr={qr} qm={qm} />
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 1) {
    const topType = show("profile") ? "profile" : "logo";
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
        <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s, paddingTop: 20 * s }}>
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            {topType === "profile" && <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />}
            {topType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {(show("company") && card.company) || (show("title") && card.title) ? (
            <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam, paddingRight: 58 * s }}>
              {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s }}>
      <View style={{ flex: 1, borderWidth: 1.5 * s, borderStyle: "solid", borderColor: ac, padding: 12 * s, paddingTop: 20 * s }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 * s }}>
          {show("logo") && <Logo uri={card.logo_image_url} size={28} s={s} lm={lm} color={ac} />}
          {show("profile") && <Profile uri={card.profile_image_url} size={38} s={s} color={ac} name={card.name} pm={pm} />}
        </View>
        {show("name") && card.name ? (
          <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {(show("company") && card.company) || (show("title") && card.title) ? (
          <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam }}>
            {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          {show("qr") && <QRBox size={44 * s} qr={qr} qm={qm} />}
        </View>
      </View>
    </View>
  );
}

// ── 앞면 템플릿 8: 다크 모드 ────────────────────────────────────────────────
function T8({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const activeCount = [show("logo"), show("profile"), show("qr")].filter(Boolean).length;

  if (!ip) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 16 * s }}>
        <View style={{ width: 28 * s, height: 3 * s, backgroundColor: ac, marginBottom: 8 * s, borderRadius: 2 * s }} />
        {activeCount === 3 ? (
          <View style={{ position: "absolute", right: 16 * s, top: 16 * s, flexDirection: "row", gap: 8 * s }}>
            <View style={{ width: 44 * s, height: 44 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />
            </View>
            <View style={{ width: 44 * s, height: 44 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={36} s={s} color={ac} name={card.name} pm={pm} />
            </View>
          </View>
        ) : show("profile") ? (
          <View style={{ position: "absolute", right: 16 * s, top: 16 * s, width: 52 * s, height: 52 * s, alignItems: "center", justifyContent: "center" }}>
            <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />
          </View>
        ) : show("logo") ? (
          <View style={{ position: "absolute", right: 16 * s, top: 16 * s, width: 52 * s, height: 52 * s, alignItems: "center", justifyContent: "center" }}>
            <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
          </View>
        ) : null}
        {show("name") && card.name ? (
          <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam, marginTop: 2 * s }}>{card.company}</Text> : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
        <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
          {(show("qr") || (activeCount >= 2 && show("logo"))) && (
            <View style={{ width: 52 * s, height: 52 * s, alignItems: "center", justifyContent: "center", marginTop: 8 * s }}>
              {show("qr") && <QRBox size={44 * s} qr={qr} qm={qm} />}
              {!show("qr") && show("logo") && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
            </View>
          )}
        </View>
      </View>
    );
  }

  const innerStyle = { width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, padding: 10 * s };
  const boxStyle = { flex: 1, padding: 12 * s, paddingTop: 20 * s };

  const contactsBlock = (
    <View style={{ gap: 2 * s }}>
      {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
      {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
      {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
      {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
      {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
    </View>
  );

  const accentBar = <View style={{ width: 28 * s, height: 3 * s, backgroundColor: ac, marginBottom: 8 * s, borderRadius: 2 * s }} />;

  const nameBlock = (pr: number) => (
    <>
      {show("name") && card.name ? (
        <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
          {card.name}
        </Text>
      ) : null}
      {(show("company") && card.company) || (show("title") && card.title) ? (
        <Text style={{ fontSize: FS.title * s * fm, fontWeight: "600", color: ac, marginTop: 2 * s, fontFamily: fontFam, paddingRight: pr }}>
          {[show("company") ? card.company : null, show("title") ? card.title : null].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3, marginTop: 8 * s, marginBottom: 8 * s }} />
    </>
  );

  if (activeCount === 3) {
    return (
      <View style={innerStyle}>
        <View style={boxStyle}>
          {accentBar}
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />
          </View>
          {nameBlock(58 * s)}
          {contactsBlock}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 * s, marginTop: 50 * s }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <QRBox size={44 * s} qr={qr} bg="rgba(255,255,255,0.08)" qm={qm} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 2) {
    const topType = show("profile") ? "profile" : "logo";
    const bottomType = show("qr") ? "qr" : "logo";
    return (
      <View style={innerStyle}>
        <View style={boxStyle}>
          {accentBar}
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            {topType === "profile" && <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />}
            {topType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
          {nameBlock(58 * s)}
          {contactsBlock}
          <View style={{ alignItems: "center", marginTop: 50 * s }}>
            {bottomType === "qr" && <QRBox size={44 * s} qr={qr} bg="rgba(255,255,255,0.08)" qm={qm} />}
            {bottomType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 1 && show("qr") && !show("logo") && !show("profile")) {
    return (
      <View style={innerStyle}>
        <View style={boxStyle}>
          {accentBar}
          <View style={{ marginBottom: 8 * s }} />
          {nameBlock(0)}
          {contactsBlock}
          <View style={{ alignItems: "center", marginTop: 40 * s }}>
            <QRBox size={44 * s} qr={qr} bg="rgba(255,255,255,0.08)" qm={qm} />
          </View>
        </View>
      </View>
    );
  }

  if (activeCount === 1) {
    const topType = show("profile") ? "profile" : "logo";
    return (
      <View style={innerStyle}>
        <View style={boxStyle}>
          {accentBar}
          <View style={{ position: "absolute", right: 12 * s, top: 18 * s, width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
            {topType === "profile" && <Profile uri={card.profile_image_url} size={42} s={s} color={ac} name={card.name} pm={pm} />}
            {topType === "logo" && <Logo uri={card.logo_image_url} size={24} s={s} lm={lm} color={ac} />}
          </View>
          {nameBlock(58 * s)}
          {contactsBlock}
        </View>
      </View>
    );
  }

  return (
    <View style={innerStyle}>
      <View style={boxStyle}>
        {accentBar}
        <View style={{ marginBottom: 8 * s }} />
        {nameBlock(0)}
        {contactsBlock}
      </View>
    </View>
  );
}

// ── 앞면 템플릿 9: 대각선 분할 ──────────────────────────────────────────────
function T9({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const activeCount = [show("logo"), show("profile"), show("qr")].filter(Boolean).length;

  const layout = (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
      <View style={{ position: "absolute", top: -H * 0.6, left: -W * 0.15, width: W * 0.75, height: H * 2.2, backgroundColor: ac, transform: [{ rotate: "12deg" }] }} />
      <View style={{ position: "absolute", top: 0, left: 0, width: W, height: H, padding: 18 * s, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
          <View style={{ gap: 2 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
        </View>
        {activeCount !== 1 && activeCount !== 2 && (
          <View style={{ flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", alignSelf: "stretch" }}>
            {show("logo") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
              </View>
            )}
            {show("profile") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
              </View>
            )}
            {show("qr") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <QRBox size={46 * s} qr={qr} qm={qm} />
              </View>
            )}
          </View>
        )}
      </View>
      {activeCount === 2 && (
        <View style={{ position: "absolute", right: W * 0.04, top: H * 0.5 - 64 * s, width: W * 0.32, alignItems: "center" }}>
          {show("logo") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center", marginBottom: 20 * s }}>
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            </View>
          )}
          {show("profile") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center", marginBottom: show("logo") ? 0 : 20 * s }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
          {show("qr") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <QRBox size={46 * s} qr={qr} qm={qm} />
            </View>
          )}
        </View>
      )}
      {activeCount === 1 && (
        <View style={{ position: "absolute", right: W * 0.04, top: 0, bottom: 0, width: W * 0.32, alignItems: "center", justifyContent: "center" }}>
          {show("logo") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            </View>
          )}
          {show("profile") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
          {show("qr") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <QRBox size={46 * s} qr={qr} qm={qm} />
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (!ip) return layout;

  const p2rightIsQR = show("qr");
  const p2rightIsProfile = !show("qr") && show("profile");
  const p2leftIsLogo = show("logo");
  const p2leftIsProfile = show("qr") && show("profile");

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
      <View style={{ position: "absolute", top: -H * 0.6, left: -W * 0.15, width: W * 0.75, height: H * 2.2, backgroundColor: ac, transform: [{ rotate: "12deg" }] }} />
      <View style={{ position: "absolute", top: 0, left: 0, width: W, height: H, padding: 18 * s, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 16 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
          <View style={{ gap: 2 * s, paddingBottom: 20 * s }}>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
        </View>
      </View>
      {activeCount === 3 && (
        <>
          <View style={{ position: "absolute", right: W * 0.04, top: 18 * s, width: W * 0.32, alignItems: "center" }}>
            {show("profile") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
              </View>
            )}
          </View>
          <View style={{ position: "absolute", left: 18 * s, top: 0, bottom: 0, width: 54 * s, alignItems: "center", justifyContent: "center" }}>
            {show("logo") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
              </View>
            )}
          </View>
          <View style={{ position: "absolute", right: W * 0.04, top: 0, bottom: 0, width: W * 0.32, alignItems: "center", justifyContent: "center" }}>
            {show("qr") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <QRBox size={46 * s} qr={qr} qm={qm} />
              </View>
            )}
          </View>
        </>
      )}
      {activeCount === 2 && (
        <View style={{ position: "absolute", left: 18 * s, top: 0, bottom: 0, width: 54 * s, alignItems: "center", justifyContent: "center" }}>
          {p2leftIsLogo && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            </View>
          )}
          {p2leftIsProfile && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
        </View>
      )}
      {activeCount === 2 && (
        <View style={{ position: "absolute", right: W * 0.04, top: 0, bottom: 0, width: W * 0.32, alignItems: "center", justifyContent: "center" }}>
          {p2rightIsQR && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <QRBox size={46 * s} qr={qr} qm={qm} />
            </View>
          )}
          {p2rightIsProfile && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
        </View>
      )}
      {activeCount === 1 && (
        <View style={{ position: "absolute", right: W * 0.04, top: 0, bottom: 0, width: W * 0.32, alignItems: "center", justifyContent: "center" }}>
          {show("logo") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            </View>
          )}
          {show("profile") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
          {show("qr") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <QRBox size={46 * s} qr={qr} qm={qm} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── 앞면 템플릿 10: 그라데이션 ──────────────────────────────────────────────
function T10({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  if (!ip) {
    return (
      <View style={{ width: W, height: H, overflow: "hidden" }}>
        {!hasBg && <LinearGradient colors={[bg, ac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={absoluteFill} />}
        <View style={{ flex: 1, padding: 18 * s, flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, justifyContent: "space-between", height: H - 36 * s }}>
            <View>
              {show("name") && card.name ? (
                <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.name}
                </Text>
              ) : null}
              {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, fontWeight: "700", marginTop: 3 * s, fontFamily: fontFam }}>{card.company}</Text> : null}
              {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.title}</Text> : null}
            </View>
            <View style={{ gap: 2 * s }}>
              {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
              {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
              {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
              {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
              {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.address}</Text> : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end", justifyContent: "space-between", height: H - 36 * s, marginLeft: 10 * s }}>
            {show("logo") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
              </View>
            )}
            {show("profile") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
              </View>
            )}
            {show("qr") && (
              <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
                <QRBox size={46 * s} qr={qr} qm={qm} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  const activeCount = [show("logo"), show("profile"), show("qr")].filter(Boolean).length;

  return (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      {!hasBg && <LinearGradient colors={[bg, ac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={absoluteFill} />}
      <View style={{ position: "absolute", top: 0, left: 0, width: W, height: H, padding: 18 * s, justifyContent: "space-between" }}>
        <View>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 17 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, fontWeight: "700", marginTop: 3 * s, fontFamily: fontFam }}>{card.company}</Text> : null}
          {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.title}</Text> : null}
        </View>
        <View style={{ gap: 2 * s, paddingBottom: 20 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
      </View>
      {activeCount > 0 && (
        <View style={{ position: "absolute", right: 18 * s, top: 18 * s, bottom: 50 * s, width: 54 * s, alignItems: "center", justifyContent: "space-between" }}>
          {show("logo") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Logo uri={card.logo_image_url} size={26} s={s} lm={lm} color={ac} />
            </View>
          )}
          {show("profile") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <Profile uri={card.profile_image_url} size={44} s={s} color={fc} name={card.name} pm={pm} />
            </View>
          )}
          {show("qr") && (
            <View style={{ width: 54 * s, height: 54 * s, alignItems: "center", justifyContent: "center" }}>
              <QRBox size={46 * s} qr={qr} qm={qm} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── 뒷면 템플릿 ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

// BT1: QR 심플 다크
function BT1({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const qrSize = Math.min(W, H) * (ip ? 0.38 : 0.34) * qm;
  const qrBoxSize = qrSize + 20 * s;
  const qrTop = ip ? H * 0.28 : H * 0.26;
  const qrLeft = W / 2 - qrBoxSize / 2;
  const qrRight = W / 2 + qrBoxSize / 2;

  if (!ip) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
        {show("logo") && (
          <View style={{ position: "absolute", top: 22 * s, left: 22 * s, width: 36 * s, height: 36 * s, alignItems: "center", justifyContent: "center" }}>
            <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />
          </View>
        )}
        {show("profile") && (
          <View style={{ position: "absolute", top: 22 * s, right: 22 * s, width: 36 * s, height: 36 * s, alignItems: "center", justifyContent: "center" }}>
            <Profile uri={card.profile_image_url} size={30} s={s} color={ac} name={card.name} pm={pm} />
          </View>
        )}
        {show("qr") && (
          <View
            style={{
              position: "absolute",
              left: qrLeft,
              top: qrTop,
              padding: 10 * s,
              borderRadius: 16 * s,
              borderWidth: 2 * s,
              borderStyle: "solid",
              borderColor: ac + "66",
              backgroundColor: "#fff",
            }}
          >
            <QRCode value={qr} size={qrSize} />
          </View>
        )}
        {show("qr") ? (
          <>
            <View
              style={{
                position: "absolute",
                left: qrLeft * 0.2,
                top: qrTop + qrBoxSize * 0.3,
                width: qrLeft - qrLeft * 0.2 - 4 * s,
                height: qrBoxSize,
                justifyContent: "center",
                gap: 3 * s,
              }}
            >
              {show("company_phone") && card.company_phone ? (
                <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }} numberOfLines={1}>
                  T. {card.company_phone}
                </Text>
              ) : null}
              {show("fax") && card.fax ? (
                <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }} numberOfLines={1}>
                  F. {card.fax}
                </Text>
              ) : null}
            </View>
            <View
              style={{ position: "absolute", left: qrRight + 12 * s, top: qrTop + qrBoxSize * 0.3, right: 8 * s, height: qrBoxSize, justifyContent: "center", gap: 3 * s }}
            >
              {show("email") && card.email ? (
                <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }} numberOfLines={1}>
                  {card.email}
                </Text>
              ) : null}
              {show("address") && card.address ? (
                <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }} numberOfLines={2}>
                  {card.address}
                </Text>
              ) : null}
            </View>
            <View style={{ position: "absolute", left: 0, right: 0, top: qrTop + qrBoxSize + 6 * s, alignItems: "center", gap: 2 * s }}>
              {show("name") && card.name ? <Text style={{ fontSize: 13 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
              <View style={{ flexDirection: "row", gap: 6 * s, alignItems: "center" }}>
                {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: ac, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
                {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
              </View>
              {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.phone}</Text> : null}
            </View>
          </>
        ) : (
          <View style={{ position: "absolute", left: 16 * s, right: 16 * s, top: 0, bottom: 0, justifyContent: "flex-end", alignItems: "center", paddingBottom: 18 * s, gap: 2 * s }}>
            {show("name") && card.name ? <Text style={{ fontSize: 13 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
            <View style={{ flexDirection: "row", gap: 6 * s, alignItems: "center" }}>
              {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: ac, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
              {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
            </View>
            {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.phone}</Text> : null}
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
            {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.email}</Text> : null}
            {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: qrTop, alignItems: "center" }}>
        {show("qr") && (
          <View style={{ padding: 10 * s, borderRadius: 16 * s, borderWidth: 2 * s, borderStyle: "solid", borderColor: ac + "66", backgroundColor: "#fff" }}>
            <QRCode value={qr} size={qrSize} />
          </View>
        )}
      </View>
      {show("logo") && (
        <View style={{ position: "absolute", top: 22 * s, left: 22 * s, width: 36 * s, height: 36 * s, alignItems: "center", justifyContent: "center" }}>
          <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />
        </View>
      )}
      {show("profile") && (
        <View style={{ position: "absolute", top: 22 * s, right: 22 * s, width: 36 * s, height: 36 * s, alignItems: "center", justifyContent: "center" }}>
          <Profile uri={card.profile_image_url} size={30} s={s} color={ac} name={card.name} pm={pm} />
        </View>
      )}
      <View style={{ position: "absolute", bottom: 14 * s, left: 16 * s, right: 16 * s, alignItems: "center", gap: 2 * s }}>
        {show("name") && card.name ? <Text style={{ fontSize: 13 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
        {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: ac, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.email}</Text> : null}
        {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
      </View>
    </View>
  );
}

// BT2: 화이트 QR
function BT2({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, ip }: TP) {
  const qrSize = (ip ? W * 0.5 : H * 0.55) * qm;
  const dividerX = W - H * 0.75;
  const profileSize = 32 * s * pm;

  const infoSection = (
    <>
      <View style={{ gap: 4 * s }}>
        {!ip && show("logo") && <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />}
        {show("name") && card.name ? (
          <Text style={{ fontSize: 14 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
        {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }}>{card.title}</Text> : null}
      </View>
      <View style={{ gap: 2 * s }}>
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, fontFamily: fontFam }}>{card.email}</Text> : null}
        {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
      </View>
    </>
  );

  const qrSection = (
    <View
      style={{
        backgroundColor: ac + "25",
        borderColor: ac + "55",
        borderStyle: "solid",
        alignItems: "center",
        justifyContent: "center",
        padding: 12 * s,
        ...(ip ? { borderTopWidth: 1, width: "100%", flex: 1 } : { borderLeftWidth: 1, width: H * 0.75, alignSelf: "stretch" }),
      }}
    >
      {show("qr") && (
        <View style={{ padding: 8 * s, backgroundColor: "#fff", borderRadius: 12 * s }}>
          <QRCode value={qr} size={qrSize} />
        </View>
      )}
      <Text style={{ fontSize: 7 * s, color: ac, marginTop: 6 * s, fontWeight: "600" }}>SCAN ME</Text>
    </View>
  );

  if (!ip) {
    return (
      <View style={{ width: W, height: H, flexDirection: "row", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
        <View style={{ flex: 1, padding: 16 * s, justifyContent: "space-between" }}>{infoSection}</View>
        {qrSection}
        {show("profile") && (
          <View style={{ position: "absolute", left: dividerX - profileSize * 1.8, top: H / 2 - profileSize / 2 }}>
            <Profile uri={card.profile_image_url} size={profileSize / s} s={s} color={ac} name={card.name} pm={pm} />
          </View>
        )}
      </View>
    );
  }
  const pOnlyOne = (show("logo") ? 1 : 0) + (show("profile") ? 1 : 0) === 1;
  return (
    <View style={{ width: W, height: H, overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      <View style={{ padding: 16 * s, gap: 8 * s }}>{infoSection}</View>
      {qrSection}
      {show("logo") && pOnlyOne && (
        <View style={{ position: "absolute", top: 14 * s, right: 14 * s }}>
          <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />
        </View>
      )}
      {show("profile") && pOnlyOne && (
        <View style={{ position: "absolute", top: 14 * s, right: 14 * s }}>
          <Profile uri={card.profile_image_url} size={profileSize / s} s={s} color={ac} name={card.name} pm={pm} />
        </View>
      )}
      {show("profile") && !pOnlyOne && (
        <View style={{ position: "absolute", top: 14 * s, right: 14 * s }}>
          <Profile uri={card.profile_image_url} size={profileSize / s} s={s} color={ac} name={card.name} pm={pm} />
        </View>
      )}
      {show("logo") && !pOnlyOne && (
        <View style={{ position: "absolute", top: 14 * s + profileSize + 8 * s, right: 14 * s }}>
          <Logo uri={card.logo_image_url} size={22} s={s} lm={lm} color={ac} />
        </View>
      )}
    </View>
  );
}

// BT3: 브랜드 컬러
function BT3({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const qrSize = Math.min(W, H) * 0.3 * qm;

  if (!ip) {
    return (
      <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
        {!hasBg && <LinearGradient colors={[bg, bg + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={absoluteFill} />}
        <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 14 * s, gap: 8 * s }}>
          {show("logo") && <Logo uri={card.logo_image_url} size={20} s={s} lm={lm} color={ac} />}
          {show("profile") && <Profile uri={card.profile_image_url} size={28} s={s} color={ac} name={card.name} pm={pm} />}
          <View style={{ flex: 1 }}>
            {show("name") && card.name ? (
              <Text style={{ fontSize: 12 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                {card.name}
              </Text>
            ) : null}
            {show("company") && card.company ? <Text style={{ fontSize: 8 * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.company}</Text> : null}
            {show("title") && card.title ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
          </View>
        </View>
        {(show("company_phone") && !!card.company_phone) || (show("fax") && !!card.fax) ? (
          <View
            style={{
              position: "absolute",
              top: 14 * s + ((show("company_phone") && !!card.company_phone) && (show("fax") && !!card.fax) ? 0 : (FS.contact * s * fm + 2 * s) / 2),
              right: 16 * s,
              alignItems: "flex-end",
              gap: 2 * s,
            }}
          >
            {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
            {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          </View>
        ) : null}
        <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.4, marginLeft: 16 * s, marginRight: 16 * s, marginTop: 8 * s }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {show("qr") && (
            <View style={{ padding: 10 * s, backgroundColor: ac, borderRadius: 14 * s }}>
              <QRCode value={qr} size={qrSize} color={bg} backgroundColor={ac} />
            </View>
          )}
        </View>
        <View style={{ paddingLeft: 16 * s, paddingRight: 16 * s, paddingBottom: 12 * s, alignItems: "center", gap: 2 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: hasBg ? "transparent" : bg, overflow: "hidden" }}>
      {!hasBg && <LinearGradient colors={[bg, bg + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={absoluteFill} />}
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16 * s, paddingRight: 16 * s, paddingTop: 14 * s, gap: 8 * s }}>
        {show("logo") && <Logo uri={card.logo_image_url} size={20} s={s} lm={lm} color={ac} />}
        {show("profile") && <Profile uri={card.profile_image_url} size={28} s={s} color={ac} name={card.name} pm={pm} />}
        <View style={{ flex: 1 }}>
          {show("name") && card.name ? (
            <Text style={{ fontSize: 12 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
          {show("company") && card.company ? <Text style={{ fontSize: 8 * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.company}</Text> : null}
          {show("title") && card.title ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.6, fontFamily: fontFam }}>{card.title}</Text> : null}
        </View>
      </View>
      <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.4, marginLeft: 16 * s, marginRight: 16 * s, marginTop: 8 * s }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {show("qr") && (
          <View style={{ padding: 10 * s, backgroundColor: ac, borderRadius: 14 * s }}>
            <QRCode value={qr} size={qrSize} color={bg} backgroundColor={ac} />
          </View>
        )}
      </View>
      <View style={{ paddingLeft: 16 * s, paddingRight: 16 * s, paddingBottom: 12 * s, alignItems: "center", gap: 2 * s }}>
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>{card.email}</Text> : null}
        {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }}>{card.address}</Text> : null}
      </View>
    </View>
  );
}

// BT4: 좌우 분할
function BT4({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const qrSize = (ip ? W * 0.45 : H * 0.5) * qm;

  const lightPanel = (
    <View style={{ flex: 1, backgroundColor: bg + "22", alignItems: "center", justifyContent: "center", gap: 6 * s }}>
      {show("qr") && (
        <View style={{ padding: 8 * s, backgroundColor: "#fff", borderRadius: 12 * s, borderWidth: 1, borderStyle: "solid", borderColor: ac + "33" }}>
          <QRCode value={qr} size={qrSize} />
        </View>
      )}
      <Text style={{ fontSize: 7 * s, color: ac, fontWeight: "600", letterSpacing: 1 }}>SCAN TO CONNECT</Text>
    </View>
  );

  if (!ip) {
    const hasLogoOrProfile = show("logo") || show("profile");
    const landscapeDarkPanel = (
      <View style={{ gap: 4 * s }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 * s }}>
          {show("logo") && (
            <View style={{ width: 36 * s, height: 36 * s, alignItems: "center", justifyContent: "center", transform: [{ scale: lm }] }}>
              <Logo uri={card.logo_image_url} size={20} s={s} lm={1} color={ac} />
            </View>
          )}
          {show("profile") && (
            <View style={{ width: 28 * s, height: 28 * s, alignItems: "center", justifyContent: "center", transform: [{ scale: pm }] }}>
              <Profile uri={card.profile_image_url} size={28} s={s} pm={1} color={ac} name={card.name} />
            </View>
          )}
          {hasLogoOrProfile && (
            <View style={{ flex: 1, gap: 1 * s }}>
              {show("name") && card.name ? (
                <Text style={{ fontSize: 11 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
                  {card.name}
                </Text>
              ) : null}
              {show("title") && card.title ? (
                <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }} numberOfLines={1}>
                  {card.title}
                </Text>
              ) : null}
            </View>
          )}
          {!hasLogoOrProfile && show("name") && card.name ? (
            <Text style={{ fontSize: 12 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }} numberOfLines={1}>
              {card.name}
            </Text>
          ) : null}
        </View>
        {hasLogoOrProfile && show("company") && card.company ? <Text style={{ fontSize: FS.address * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
        {!hasLogoOrProfile && show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
        {!hasLogoOrProfile && show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }}>{card.title}</Text> : null}
        <View style={{ height: 1 * s, backgroundColor: ac, opacity: 0.3 }} />
        <View style={{ gap: 2 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? (
            <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }} numberOfLines={1}>
              {card.email}
            </Text>
          ) : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }} numberOfLines={1}>
              {card.address}
            </Text>
          ) : null}
        </View>
      </View>
    );
    return (
      <View style={{ width: W, height: H, flexDirection: "row", overflow: "hidden", backgroundColor: hasBg ? "transparent" : bg }}>
        <View style={{ width: W * 0.42, padding: 14 * s, justifyContent: "space-between" }}>{landscapeDarkPanel}</View>
        {lightPanel}
      </View>
    );
  }
  const profBaseSize = 30 * s;
  const logoBaseSize = 20 * 1.8 * s;
  return (
    <View style={{ width: W, height: H, overflow: "hidden", backgroundColor: hasBg ? "transparent" : bg }}>
      <View style={{ padding: 14 * s, paddingRight: 14 * s + profBaseSize + 10 * s, gap: 2 * s }}>
        {show("name") && card.name ? <Text style={{ fontSize: 12 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
        {show("company") && card.company ? <Text style={{ fontSize: FS.company * s * fm, fontWeight: "700", color: ac, fontFamily: fontFam }}>{card.company}</Text> : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }}>{card.title}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 14 * s, marginRight: 14 * s, marginBottom: 6 * s }}>
        <View style={{ flex: 1, height: 1 * s, backgroundColor: ac, opacity: 0.3 }} />
      </View>
      <View style={{ flexDirection: "row", paddingLeft: 14 * s, paddingRight: 14 * s, gap: 8 * s }}>
        <View style={{ flex: 1, gap: 2 * s }}>
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.8, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? (
            <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.7, fontFamily: fontFam }} numberOfLines={1}>
              {card.email}
            </Text>
          ) : null}
          {show("address") && card.address ? (
            <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.5, fontFamily: fontFam }} numberOfLines={1}>
              {card.address}
            </Text>
          ) : null}
        </View>
        {show("logo") && (
          <View style={{ marginTop: 6 * s, width: logoBaseSize, height: logoBaseSize, alignItems: "center", justifyContent: "center", transform: [{ scale: lm }] }}>
            <Logo uri={card.logo_image_url} size={20} s={s} lm={1} color={ac} />
          </View>
        )}
      </View>
      {show("profile") && (
        <View
          style={{
            position: "absolute",
            top: 22 * s,
            right: 14 * s,
            width: profBaseSize,
            height: profBaseSize,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pm }],
          }}
        >
          <Profile uri={card.profile_image_url} size={30} s={s} pm={1} color={ac} name={card.name} />
        </View>
      )}
      {lightPanel}
    </View>
  );
}

// BT5: 그라데이션 QR
function BT5({ card, s, W, H, bg, ac, fc, ff: fontFam, fm, lm, pm, qm, show, qr, hasBg, ip }: TP) {
  const qrSize = Math.min(W, H) * 0.3 * qm;

  const layout = (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      {!hasBg && <LinearGradient colors={[bg, ac]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={absoluteFill} />}
      {show("profile") && (
        <View style={{ position: "absolute", top: 14 * s, left: 16 * s }}>
          <Profile uri={card.profile_image_url} size={36} s={s} color={fc} name={card.name} pm={pm} />
        </View>
      )}
      <View style={{ position: "absolute", top: 14 * s, right: 14 * s }}>
        {show("qr") && (
          <View style={{ padding: 7 * s, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 10 * s }}>
            <QRCode value={qr} size={qrSize} />
          </View>
        )}
      </View>
      {show("logo") && (
        <View style={{ position: "absolute", bottom: 14 * s, right: 14 * s }}>
          <Logo uri={card.logo_image_url} size={20} s={s} lm={lm} color={fc} />
        </View>
      )}
      <View
        style={{
          position: "absolute",
          bottom: 14 * s,
          left: 16 * s,
          right: show("logo") ? 14 * s + 20 * 1.8 * s * lm + 10 * s : 16 * s,
          gap: 2 * s,
        }}
      >
        {show("name") && card.name ? <Text style={{ fontSize: 15 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
        {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, opacity: 0.8, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
        {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>{card.title}</Text> : null}
        <View style={{ height: 1 * s, width: 36 * s, backgroundColor: fc, opacity: 0.3, marginTop: 2 * s, marginBottom: 2 * s }} />
        {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.phone}</Text> : null}
        {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
        {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
        {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.email}</Text> : null}
        {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }}>{card.address}</Text> : null}
      </View>
    </View>
  );

  if (!ip) {
    const qrBoxSize = qrSize + 14 * s;
    return (
      <View style={{ width: W, height: H, overflow: "hidden" }}>
        {!hasBg && <LinearGradient colors={[bg, ac]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={absoluteFill} />}
        <View style={{ position: "absolute", top: 14 * s, left: 16 * s }}>{show("logo") && <Logo uri={card.logo_image_url} size={20} s={s} lm={lm} color={fc} />}</View>
        <View style={{ position: "absolute", top: 14 * s, right: 14 * s }}>
          {show("qr") && (
            <View style={{ padding: 7 * s, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 10 * s }}>
              <QRCode value={qr} size={qrSize} />
            </View>
          )}
        </View>
        {show("profile") && (
          <View style={{ position: "absolute", bottom: 14 * s, right: 14 * s }}>
            <Profile uri={card.profile_image_url} size={36} s={s} color={fc} name={card.name} pm={pm} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 14 * s,
            left: 16 * s,
            right: show("profile") ? 14 * s + 28 * s * pm + 10 * s : 16 * s,
            gap: 2 * s,
          }}
        >
          {show("name") && card.name ? <Text style={{ fontSize: 15 * s * fm, fontWeight: "800", color: fc, fontFamily: fontFam }}>{card.name}</Text> : null}
          {show("company") && card.company ? <Text style={{ fontSize: 9 * s * fm, color: fc, opacity: 0.8, fontWeight: "700", fontFamily: fontFam }}>{card.company}</Text> : null}
          {show("title") && card.title ? <Text style={{ fontSize: FS.title * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>{card.title}</Text> : null}
          <View style={{ height: 1 * s, width: 36 * s, backgroundColor: fc, opacity: 0.3, marginTop: 2 * s, marginBottom: 2 * s }} />
          {show("phone") && card.phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.phone}</Text> : null}
          {show("company_phone") && card.company_phone ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>T. {card.company_phone}</Text> : null}
          {show("fax") && card.fax ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.65, fontFamily: fontFam }}>F. {card.fax}</Text> : null}
          {show("email") && card.email ? <Text style={{ fontSize: FS.contact * s * fm, color: fc, opacity: 0.75, fontFamily: fontFam }}>{card.email}</Text> : null}
          {show("address") && card.address ? <Text style={{ fontSize: FS.address * s * fm, color: fc, opacity: 0.55, fontFamily: fontFam }}>{card.address}</Text> : null}
        </View>
      </View>
    );
  }
  return layout;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function CardPreview({ card, scale = 1, side = "front" }: CardPreviewProps) {
  const isFront = side === "front";

  const isPortrait = isFront ? card.orientation === "portrait" : card.back_orientation === "portrait";
  const { W: baseW, H: baseH } = isPortrait ? P : L;
  const W = baseW * scale;
  const H = baseH * scale;

  const showFields = isFront ? (card.visible_fields ?? []) : (card.back_fields ?? []);
  const show = (f: string) => showFields.includes(f);

  const bg = isFront ? (card.bg_color ?? "#FFFFFF") : (card.back_bg_color ?? "#FFFFFF");
  const ac = isFront ? (card.accent_color ?? "#4F6CFF") : (card.back_accent_color ?? "#4F6CFF");
  const fc = isFront ? (card.font_color ?? "#111827") : (card.back_font_color ?? "#111827");
  const ff = isFront ? (card.font_type ?? "system") : (card.back_font_type ?? card.font_type ?? "system");
  const fm = isFront ? (card.font_size ?? 1.0) : (card.back_font_size ?? card.font_size ?? 1.0);
  const bgImg = isFront ? card.bg_image_url : card.back_bg_image_url;

  const qrUrl = card.id ? `https://www.globalmarketradar.com/cardlogue/card/${card.id}` : "https://www.globalmarketradar.com/cardlogue";

  const displayCard = isFront
    ? card
    : {
        ...card,
        name: card.back_name ?? "",
        company: card.back_company ?? "",
        title: card.back_title ?? "",
        phone: card.back_phone ?? "",
        company_phone: card.back_company_phone ?? "",
        fax: card.back_fax ?? "",
        email: card.back_email ?? "",
        address: card.back_address ?? "",
      };

  const tp: TP = {
    card: displayCard,
    s: scale,
    W,
    H,
    bg,
    ac,
    fc,
    ff: fontFamily(ff),
    fm,
    lm: card.logo_size ?? 1.0,
    pm: card.profile_size ?? 1.0,
    qm: card.qr_size ?? 1.0,
    show,
    qr: qrUrl,
    hasBg: !!bgImg,
    ip: isPortrait,
  };

  const allTemplates: Record<number, React.ReactNode> = {
    1: <T1 {...tp} />,
    2: <T2 {...tp} />,
    3: <T3 {...tp} />,
    4: <T4 {...tp} />,
    5: tp.ip ? <T5P {...tp} /> : <T5 {...tp} />,
    6: <T6 {...tp} />,
    7: <T7 {...tp} />,
    8: <T8 {...tp} />,
    9: <T9 {...tp} />,
    10: <T10 {...tp} />,
    11: <BT1 {...tp} />,
    12: <BT2 {...tp} />,
    13: <BT3 {...tp} />,
    14: <BT4 {...tp} />,
    15: <BT5 {...tp} />,
  };

  const templateId = isFront ? (card.template_id ?? 1) : (card.back_template_id ?? 1);
  const content = allTemplates[templateId] ?? <T1 {...tp} />;

  return (
    <div style={{ width: W, height: H, borderRadius: 12 * scale, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.18)", position: "relative" }}>
      {bgImg && <img src={bgImg} style={{ ...absoluteFill, width: W, height: H, objectFit: "cover" }} />}
      {bgImg && <div style={{ ...absoluteFill, backgroundColor: tp.bg, opacity: 0.45 }} />}
      {content}
    </div>
  );
}
