import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Set Vite environment variables before build
  process.env.VITE_SUPABASE_URL = 'https://glcjcsxvfojwvyvdebi.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2pjc3h2Zm9qd3Z5dmRlYmkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczOTUzOTkwOCwiZXhwIjoyMDU1MTE1OTA4fQ.6pPAB7LSFgE9Cqh0GKNH-m4DxZqpJBN8jgGhm0kFNoc';


  console.log("building client...");
  await viteBuild({
    mode: 'production',
    envFile: false, // .env 파일 자동 로드 비활성화
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://glcjcsxvfojwvyvdebi.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2pjc3h2Zm9qd3Z5dmRlYmkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczOTUzOTkwOCwiZXhwIjoyMDU1MTE1OTA4fQ.6pPAB7LSFgE9Cqh0GKNH-m4DxZqpJBN8jgGhm0kFNoc'),
    },
  });

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
