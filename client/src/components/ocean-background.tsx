import { useEffect, useRef } from "react";

const NAVY = "#03045E";
const CYAN = "#00D4FF";

export function OceanBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      ref.current?.style.setProperty("--mx", `${e.clientX}px`);
      ref.current?.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <div
        className="absolute -top-24 -left-16 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl animate-navy-drift"
        style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[480px] h-[480px] rounded-full opacity-25 blur-3xl animate-navy-drift-slow"
        style={{ background: "radial-gradient(circle, #1e4d8f 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-20 blur-3xl animate-navy-drift"
        style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)`, animationDelay: "-6s" }}
      />

      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path
          d="M-50,220 C 250,120 450,340 750,220 S 1250,120 1350,220"
          fill="none"
          stroke={CYAN}
          strokeWidth="1.5"
          className="animate-navy-line-flow"
        />
        <path
          d="M-50,420 C 250,520 450,300 750,420 S 1250,520 1350,420"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1"
          className="animate-navy-line-flow"
          style={{ animationDuration: "9s", animationDirection: "reverse" }}
        />
        <path
          d="M-50,600 C 250,500 450,680 750,600 S 1250,500 1350,600"
          fill="none"
          stroke={CYAN}
          strokeWidth="1"
          className="animate-navy-line-flow"
          style={{ animationDuration: "11s" }}
        />
      </svg>

      {/* Cursor spotlight, tracked across the whole page */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), ${CYAN}1a, transparent 60%)` }}
      />
    </div>
  );
}
