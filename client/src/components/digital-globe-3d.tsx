import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ThreeGlobe from "three-globe";

// buildGlobe() normalizes three-globe's radius-100 sphere down to radius 1.
// GLOBE_SCALE then sets the final on-screen size: world radius = 1 * GLOBE_SCALE.
// Keeping that well inside the camera frustum (and locking OrbitControls'
// min/maxDistance so it can't drift on mount) is what keeps the sphere reading
// as a small round globe with dark margin, instead of filling the frame.
const CAMERA_DISTANCE = 15;
const GLOBE_SCALE = 5.28;
const FOV = 42;

const CYAN = "#00FFFF";
const COUNTRIES_URL = "/countries.geojson";

// The continent layer is a point-and-line wireframe network (traced from real
// coastline/border vertices), not a filled polygon map — this is what gives
// the "glowing data network" look instead of a lit-up atlas.
const NETWORK_RADIUS = 1.01;
const TARGET_TOTAL_POINTS = 6000;
const MIN_POINTS_PER_RING = 3;

// Sits just above the opaque ocean sphere (radius 1) but below the country
// network (1.01), so it reads as "on" the globe without z-fighting either.
const GRID_RADIUS = 1.003;
const GRID_LATITUDES = [-60, -30, 0, 30, 60];
const GRID_LONGITUDES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function buildGlobe() {
  // animateIn: false — otherwise three-globe tweens its own internal scale
  // from ~0 to 1 over 600ms on init, which stomps any scale we set below.
  const globe = new ThreeGlobe({ animateIn: false })
    .globeImageUrl(null as unknown as string)
    .showAtmosphere(true)
    .atmosphereColor(CYAN)
    .atmosphereAltitude(0.6);

  // MeshBasicMaterial doesn't depend on scene lighting, so the globe stays
  // visibly navy regardless of light setup. Matches the page's ambient navy
  // background (see ocean-background.tsx) so the ocean blends into the scene.
  // Opaque (not transparent) so it renders in the opaque pass and reliably
  // writes/tests depth — that's what hides the far side of the globe behind
  // the near side, instead of transparent back-side geometry bleeding through.
  globe.globeMaterial(new THREE.MeshBasicMaterial({ color: "#03045E" }));

  // Normalize three-globe's default radius-100 sphere down to radius 1.
  globe.scale.set(0.01, 0.01, 0.01);

  return globe;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

type GeoJsonFeatureCollection = { features: { geometry: { type: string; coordinates: unknown } | null }[] };

// Each ring is a GeoJSON polygon boundary — an ordered sequence of vertices
// tracing that shape's outline. Rather than nearest-neighbor-matching points
// across the whole globe (which spuriously links unrelated countries whose
// vertices happen to sit close together in 3D, especially near the poles
// where meridians converge), we extract each ring separately and only ever
// connect points that are adjacent *within their own ring*. That guarantees
// every line segment traces a real border/coastline.
function extractRings(geojson: GeoJsonFeatureCollection): [number, number][][] {
  const rings: [number, number][][] = [];
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    const polygons =
      geom.type === "Polygon"
        ? [geom.coordinates as number[][][]]
        : geom.type === "MultiPolygon"
          ? (geom.coordinates as number[][][][])
          : [];
    for (const poly of polygons) {
      for (const ring of poly) {
        rings.push(ring.map(([lng, lat]) => [lat, lng]));
      }
    }
  }
  return rings;
}

// Decimates each ring toward a global point budget, proportional to its
// original vertex count (so detailed coastlines stay detailed relative to
// simple borders), while keeping every ring recognizable.
function decimateRings(rings: [number, number][][], targetTotal: number, minPerRing: number): [number, number][][] {
  const totalRaw = rings.reduce((sum, ring) => sum + ring.length, 0);
  const ratio = Math.min(1, targetTotal / totalRaw);
  return rings.map((ring) => {
    const keep = Math.max(minPerRing, Math.round(ring.length * ratio));
    if (keep >= ring.length) return ring;
    const step = ring.length / keep;
    return Array.from({ length: keep }, (_, i) => ring[Math.floor(i * step)]);
  });
}

// Static lat/lng graticule — a faint reference grid over the globe surface,
// like a real map projection would show. No animation, just structure.
function buildGraticuleGeometry(): THREE.BufferGeometry {
  const segments = 64;
  const linePositions: number[] = [];

  for (const lat of GRID_LATITUDES) {
    const ring = Array.from({ length: segments + 1 }, (_, i) => latLngToVector3(lat, -180 + (360 * i) / segments, GRID_RADIUS));
    for (let i = 0; i < ring.length - 1; i++) {
      linePositions.push(ring[i].x, ring[i].y, ring[i].z, ring[i + 1].x, ring[i + 1].y, ring[i + 1].z);
    }
  }
  for (const lng of GRID_LONGITUDES) {
    const meridian = Array.from({ length: segments + 1 }, (_, i) => latLngToVector3(-90 + (180 * i) / segments, lng, GRID_RADIUS));
    for (let i = 0; i < meridian.length - 1; i++) {
      linePositions.push(meridian[i].x, meridian[i].y, meridian[i].z, meridian[i + 1].x, meridian[i + 1].y, meridian[i + 1].z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  return geometry;
}

function GraticuleGrid() {
  const geometry = useMemo(buildGraticuleGeometry, []);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={CYAN} transparent opacity={0.12} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

const CYAN_RGB = new THREE.Color(CYAN);
// Equator glows brightest, tapering to a dimmer tone toward the poles —
// breaks up the otherwise flat, uniform neon look. Exponent < 1 makes the
// falloff start early (even mid-latitudes noticeably dim), since the visible
// hemisphere on screen rarely spans all the way to an actual pole.
const POLE_BRIGHTNESS = 0.08;
const FALLOFF_EXPONENT = 0.5;
function latBrightness(lat: number): number {
  return 1 - (1 - POLE_BRIGHTNESS) * Math.pow(Math.abs(lat) / 90, FALLOFF_EXPONENT);
}

// Points are split across a few fixed sizes (rather than one uniform size)
// so the network doesn't read as a mechanically even dot grid.
const POINT_SIZE_TIERS = [
  { size: 0.004, weight: 0.55 },
  { size: 0.007, weight: 0.3 },
  { size: 0.011, weight: 0.15 },
];

function pickSizeTier(): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < POINT_SIZE_TIERS.length; i++) {
    acc += POINT_SIZE_TIERS[i].weight;
    if (r < acc) return i;
  }
  return POINT_SIZE_TIERS.length - 1;
}

function ContinentNetwork() {
  const pointsGeomRefs = [useRef<THREE.BufferGeometry>(null), useRef<THREE.BufferGeometry>(null), useRef<THREE.BufferGeometry>(null)];
  const linesGeomRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    fetch(COUNTRIES_URL)
      .then((res) => res.json())
      .then((geojson: GeoJsonFeatureCollection) => {
        const rings = decimateRings(extractRings(geojson), TARGET_TOTAL_POINTS, MIN_POINTS_PER_RING);
        const ringData = rings.map((ring) =>
          ring.map(([lat, lng]) => ({ position: latLngToVector3(lat, lng, NETWORK_RADIUS), lat }))
        );
        const flat = ringData.flat();

        const tierBuckets: { positions: THREE.Vector3[]; colors: number[] }[] = POINT_SIZE_TIERS.map(() => ({
          positions: [],
          colors: [],
        }));
        for (const v of flat) {
          const b = latBrightness(v.lat);
          const bucket = tierBuckets[pickSizeTier()];
          bucket.positions.push(v.position);
          bucket.colors.push(CYAN_RGB.r * b, CYAN_RGB.g * b, CYAN_RGB.b * b);
        }
        tierBuckets.forEach((bucket, i) => {
          const geom = pointsGeomRefs[i].current;
          geom?.setFromPoints(bucket.positions);
          geom?.setAttribute("color", new THREE.Float32BufferAttribute(bucket.colors, 3));
        });

        const linePositions: number[] = [];
        const lineColors: number[] = [];
        for (const vertices of ringData) {
          for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length]; // close the loop back to the first vertex
            linePositions.push(a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z);
            const ba = latBrightness(a.lat);
            const bb = latBrightness(b.lat);
            lineColors.push(CYAN_RGB.r * ba, CYAN_RGB.g * ba, CYAN_RGB.b * ba, CYAN_RGB.r * bb, CYAN_RGB.g * bb, CYAN_RGB.b * bb);
          }
        }
        linesGeomRef.current?.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
        linesGeomRef.current?.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
      })
      .catch((err) => console.error("Failed to load country network:", err));
  }, []);

  return (
    <group>
      {POINT_SIZE_TIERS.map((tier, i) => (
        <points key={i}>
          <bufferGeometry ref={pointsGeomRefs[i]} />
          <pointsMaterial vertexColors size={tier.size} sizeAttenuation transparent opacity={0.85} blending={THREE.AdditiveBlending} />
        </points>
      ))}
      <lineSegments>
        <bufferGeometry ref={linesGeomRef} />
        <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

const CITY_RADIUS = 1.015;
const RED = "#FF2D2D";

// Major world cities, marked as independently blinking red dots.
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Seoul", lat: 37.5665, lng: 126.978 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Beijing", lat: 39.9042, lng: 116.4074 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Taipei", lat: 25.033, lng: 121.5654 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Moscow", lat: 55.7558, lng: 37.6173 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Oslo", lat: 59.9139, lng: 10.7522 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { name: "Delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Ulaanbaatar", lat: 47.8864, lng: 106.9057 },
  { name: "Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { name: "Bogota", lat: 4.711, lng: -74.0721 },
  { name: "Caracas", lat: 10.4806, lng: -66.9036 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { name: "Sao Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Santiago", lat: -33.4489, lng: -70.6693 },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Tehran", lat: 35.6892, lng: 51.389 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { name: "Quebec City", lat: 46.8139, lng: -71.208 },
  { name: "Montreal", lat: 45.5019, lng: -73.5674 },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { name: "Doha", lat: 25.2854, lng: 51.531 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Hanoi", lat: 21.0278, lng: 105.8342 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Budapest", lat: 47.4979, lng: 19.0402 },
  // Africa
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
  { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { name: "Addis Ababa", lat: 9.0192, lng: 38.7525 },
  { name: "Honolulu", lat: 21.3069, lng: -157.8583 },
];

// Blinks once roughly every 2 seconds, but with a randomized phase and speed
// per city so the 40+ dots never blink in unison.
function CityBlinkNode({ position }: { position: THREE.Vector3 }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const [phase] = useState(() => Math.random() * Math.PI * 2);
  const [speed] = useState(() => Math.PI * (0.8 + Math.random() * 0.4));

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const t = clock.elapsedTime * speed + phase;
    const flash = Math.pow(Math.max(0, Math.sin(t)), 6);
    materialRef.current.opacity = 0.2 + flash * 0.8;
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.007, 8, 8]} />
      <meshBasicMaterial ref={materialRef} color={RED} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function CityMarkers() {
  return (
    <group>
      {CITIES.map((city) => (
        <CityBlinkNode key={city.name} position={latLngToVector3(city.lat, city.lng, CITY_RADIUS)} />
      ))}
    </group>
  );
}

const CONNECTIONS_PER_CITY = 3;

// A couple of connections are pinned rather than left to chance.
const FORCED_CONNECTIONS: [string, string][] = [["Honolulu", "Tokyo"]];

// Each city links to 3 others (deduped so a pair is never drawn twice).
function buildCityConnections(): [number, number][] {
  const seen = new Set<string>();
  const pairs: [number, number][] = [];

  const degree = new Array(CITIES.length).fill(0);
  const nameToIndex = new Map(CITIES.map((city, i) => [city.name, i]));
  for (const [nameA, nameB] of FORCED_CONNECTIONS) {
    const i = nameToIndex.get(nameA);
    const j = nameToIndex.get(nameB);
    if (i === undefined || j === undefined) continue;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    seen.add(key);
    pairs.push([i, j]);
    degree[i]++;
    degree[j]++;
  }

  // Forced connections count toward each city's 3-connection budget.
  CITIES.forEach((_, i) => {
    const others = CITIES.map((_, j) => j)
      .filter((j) => j !== i)
      .sort(() => Math.random() - 0.5);
    for (const j of others) {
      if (degree[i] >= CONNECTIONS_PER_CITY) break;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([i, j]);
      degree[i]++;
      degree[j]++;
    }
  });
  return pairs;
}

// A dim curved line traces the city-to-city connection, with a small bright
// dot continuously traveling along it — reads as data flowing between hubs.
function ConnectionCurve({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const [phase] = useState(() => Math.random());
  const [cyclesPerSecond] = useState(() => 0.12 + Math.random() * 0.15);

  const curve = useMemo(() => {
    const angle = a.angleTo(b);
    // Farther-apart cities arc higher, like three-globe's altitude auto-scale.
    const altitude = 0.12 + 0.35 * (angle / Math.PI);
    const mid = a.clone().add(b).normalize().multiplyScalar(CITY_RADIUS + altitude);
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [a, b]);

  // Built as a plain THREE.Line (via <primitive>) rather than the JSX <line>
  // intrinsic — R3F's <line> collides with the DOM/SVG "line" element type.
  const lineObject = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
    const material = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending });
    return new THREE.Line(geometry, material);
  }, [curve]);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = (clock.elapsedTime * cyclesPerSecond + phase) % 1;
    pulseRef.current.position.copy(curve.getPointAt(t));
  });

  return (
    <group>
      <primitive object={lineObject} />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.009, 6, 6]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CityConnections() {
  const pairs = useMemo(buildCityConnections, []);
  return (
    <group>
      {pairs.map(([i, j], idx) => (
        <ConnectionCurve
          key={idx}
          a={latLngToVector3(CITIES[i].lat, CITIES[i].lng, CITY_RADIUS)}
          b={latLngToVector3(CITIES[j].lat, CITIES[j].lng, CITY_RADIUS)}
        />
      ))}
    </group>
  );
}

function GlobeMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const [globe] = useState(buildGlobe);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.09;
  });

  return (
    <group ref={groupRef}>
      <primitive object={globe} />
      <GraticuleGrid />
      <ContinentNetwork />
      <CityConnections />
      <CityMarkers />
    </group>
  );
}

export function DigitalGlobe3D({ size = 320 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, overflow: "hidden", position: "relative" }} data-testid="canvas-digital-globe-3d">
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV }}
        style={{ background: "transparent", width: size, height: size, display: "block" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 2, 4]} intensity={0.3} />
        <group scale={GLOBE_SCALE}>
          <GlobeMesh />
        </group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.5}
          minDistance={CAMERA_DISTANCE}
          maxDistance={CAMERA_DISTANCE}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(Math.PI * 2) / 3}
        />
      </Canvas>
    </div>
  );
}
