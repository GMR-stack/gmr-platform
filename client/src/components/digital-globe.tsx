import { useEffect, useRef } from "react";

const CYAN = "#00D4FF";

type Point3D = [number, number, number];
type Node = { p: Point3D; isLand: boolean };

// Rough continent bounding boxes in [lonMin, lonMax, latMin, latMax] degrees,
// used to bias point density toward recognizable continent silhouettes.
const CONTINENTS: [number, number, number, number][] = [
  [-170, -140, 55, 70], // Alaska
  [-125, -70, 25, 60], // Canada / US
  [-118, -90, 14, 25], // Mexico
  [-80, -35, -5, 12], // N. South America
  [-73, -53, -55, -5], // S. South America
  [-10, 40, 36, 70], // Europe
  [-18, 50, -35, 37], // Africa
  [40, 150, 5, 55], // Main Asia
  [60, 180, 55, 75], // Siberia
  [65, 120, -10, 25], // South / SE Asia
  [113, 154, -44, -10], // Australia
];

function fibonacciPoint(i: number, total: number): Point3D {
  const phi = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / (total - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = phi * i;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

function latLonToXYZ(latDeg: number, lonDeg: number): Point3D {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
}

function inLand(p: Point3D) {
  const latDeg = (Math.asin(p[1]) * 180) / Math.PI;
  const lonDeg = (Math.atan2(p[2], p[0]) * 180) / Math.PI;
  return CONTINENTS.some(([lonMin, lonMax, latMin, latMax]) => lonDeg >= lonMin && lonDeg <= lonMax && latDeg >= latMin && latDeg <= latMax);
}

function generateNodes(): Node[] {
  const nodes: Node[] = [];
  // Sparse full-sphere base coverage (mostly ocean feel).
  const baseCount = 220;
  for (let i = 0; i < baseCount; i++) {
    const p = fibonacciPoint(i, baseCount);
    nodes.push({ p, isLand: inLand(p) });
  }
  // Denser overlay restricted to land, for continent clusters.
  const denseCount = 500;
  for (let i = 0; i < denseCount; i++) {
    const p = fibonacciPoint(i, denseCount);
    if (inLand(p)) nodes.push({ p, isLand: true });
  }
  return nodes;
}

function dist(a: Point3D, b: Point3D) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function buildEdges(nodes: Node[], threshold: number, maxPerPoint: number) {
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const candidates: { j: number; d: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const d = dist(nodes[i].p, nodes[j].p);
      if (d < threshold) candidates.push({ j, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    for (const { j } of candidates.slice(0, maxPerPoint)) {
      if (j > i) edges.push([i, j]);
    }
  }
  return edges;
}

function generateGridLines(): Point3D[][] {
  const lines: Point3D[][] = [];
  const steps = 64;
  for (const lat of [-60, -30, 0, 30, 60]) {
    const ring: Point3D[] = [];
    for (let i = 0; i <= steps; i++) ring.push(latLonToXYZ(lat, -180 + (360 * i) / steps));
    lines.push(ring);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const meridian: Point3D[] = [];
    for (let i = 0; i <= steps; i++) meridian.push(latLonToXYZ(-90 + (180 * i) / steps, lon));
    lines.push(meridian);
  }
  return lines;
}

function rotateY(p: Point3D, a: number): Point3D {
  const [x, y, z] = p;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

export function DigitalGlobe({ size = 320 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const nodes = generateNodes();
    const edges = buildEdges(nodes, 0.22, 2);
    const gridLines = generateGridLines();

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;

    const project = (p: Point3D) => ({ x: cx + p[0] * radius, y: cy + p[1] * radius, z: p[2] });

    let angle = 0;
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      angle += 0.0035;

      // Sphere outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${CYAN}22`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lat/lon grid
      for (const line of gridLines) {
        ctx.beginPath();
        let started = false;
        for (const p of line) {
          const rp = rotateY(p, angle);
          const proj = project(rp);
          const opacity = Math.max(0, 0.03 + rp[2] * 0.1);
          if (opacity <= 0.012) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(proj.x, proj.y);
            started = true;
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.strokeStyle = `${CYAN}20`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      const rotated = nodes.map((n) => ({ ...n, rp: rotateY(n.p, angle) }));
      const projected = rotated.map((n) => ({ ...n, proj: project(n.rp) }));

      // Network edges
      for (const [i, j] of edges) {
        const a = projected[i];
        const b = projected[j];
        const depth = (a.rp[2] + b.rp[2]) / 2;
        const base = a.isLand && b.isLand ? 0.16 : 0.06;
        const opacity = Math.max(0, base + depth * 0.18);
        if (opacity <= 0.02) continue;
        ctx.strokeStyle = `${CYAN}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.proj.x, a.proj.y);
        ctx.lineTo(b.proj.x, b.proj.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of projected) {
        const depth = (n.rp[2] + 1) / 2; // 0 back .. 1 front
        const r = (n.isLand ? 0.9 : 0.6) + depth * 1.3;
        const baseOpacity = n.isLand ? 0.3 : 0.12;
        const opacity = baseOpacity + depth * 0.7;
        ctx.beginPath();
        ctx.fillStyle = `${CYAN}${Math.round(Math.min(1, opacity) * 255).toString(16).padStart(2, "0")}`;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = n.isLand && depth > 0.55 ? 5 : 0;
        ctx.arc(n.proj.x, n.proj.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block"
      data-testid="canvas-digital-globe"
    />
  );
}
