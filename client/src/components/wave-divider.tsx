export function WaveDivider() {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className="w-full h-6 block"
      aria-hidden="true"
    >
      <path
        d="M0,20 C150,40 300,0 450,16 C600,32 750,4 900,18 C1050,32 1150,10 1200,20 L1200,40 L0,40 Z"
        fill="rgba(255,255,255,0.06)"
      />
      <path
        d="M0,22 C150,38 300,6 450,20 C600,34 750,8 900,22 C1050,34 1150,14 1200,22"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
