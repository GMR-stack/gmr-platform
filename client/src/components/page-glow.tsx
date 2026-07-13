const CYAN = "#00D4FF";

const BUBBLES = [
  { left: "6%", size: 6, duration: 15, delay: 0, opacity: 0.3, drift: "10px" },
  { left: "16%", size: 4, duration: 12, delay: 3, opacity: 0.25, drift: "-8px" },
  { left: "28%", size: 8, duration: 18, delay: 1.5, opacity: 0.3, drift: "14px" },
  { left: "42%", size: 5, duration: 13, delay: 6, opacity: 0.22, drift: "-10px" },
  { left: "58%", size: 7, duration: 17, delay: 2, opacity: 0.28, drift: "8px" },
  { left: "72%", size: 4, duration: 11, delay: 4.5, opacity: 0.25, drift: "-12px" },
  { left: "84%", size: 9, duration: 20, delay: 0.5, opacity: 0.3, drift: "10px" },
  { left: "93%", size: 5, duration: 14, delay: 7, opacity: 0.22, drift: "-6px" },
];

// A quieter, static cousin of OceanBackground for content pages (Cardlogue,
// legal pages, payment) — same accent color, a much slower drift than the
// homepage, plus a handful of rising bubbles so it reads as "underwater"
// rather than a flat gradient.
export function PageGlow() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl animate-navy-drift-page"
        style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-[-10%] -left-10 w-[380px] h-[380px] rounded-full opacity-15 blur-3xl animate-navy-drift-page"
        style={{ background: "radial-gradient(circle, #1e4d8f 0%, transparent 70%)", animationDelay: "-12s" }}
      />
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-full bg-white animate-bubble-rise"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            ["--bubble-duration" as string]: `${b.duration}s`,
            ["--bubble-delay" as string]: `-${b.delay}s`,
            ["--bubble-opacity" as string]: b.opacity,
            ["--bubble-drift" as string]: b.drift,
          }}
        />
      ))}
    </div>
  );
}
