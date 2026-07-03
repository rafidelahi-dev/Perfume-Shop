import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local (no dotenv dependency needed)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface PerfumeRow {
  slug: string;
  name: string;
  brand: string;
  meta_title: string;
  meta_description: string;
}

// Helper — generates a slug from a perfume name if you don't want to type
// them all manually:  slugify("Dior Sauvage") → "dior-sauvage"
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Fill this array with your 100 perfumes.
// Each entry maps directly to a row in the `perfumes` table.
//
// Format from list.txt:
//   "{Name} — {meta_title} — {meta_description}"
//   e.g. "Afnan 9pm — Afnan 9pm in Bangladesh — compare decant prices..."
//
// Quick tip: slug is auto-generated from `name` via slugify() if you leave it
// as an empty string, but setting it explicitly is safer for stable URLs.
// ---------------------------------------------------------------------------
const PERFUMES: PerfumeRow[] = [
  // Paste your entries here, e.g.:
  // {
  //   slug: "afnan-9pm",
  //   name: "9pm",
  //   brand: "Afnan",
  //   meta_title: "Afnan 9pm in Bangladesh",
  //   meta_description: "compare decant prices (5ml/10ml/30ml) from verified sellers. Read reviews & find cheapest sellers near you.",
  // },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (PERFUMES.length === 0) {
    console.error("PERFUMES array is empty — fill it in before running.");
    process.exit(1);
  }

  // Auto-fill any blank slugs
  const rows: PerfumeRow[] = PERFUMES.map((p) => ({
    ...p,
    slug: p.slug || slugify(`${p.brand} ${p.name}`),
  }));

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // Find which slugs already exist so we can report inserted vs skipped
  const { data: existing, error: fetchErr } = await supabase
    .from("perfumes")
    .select("slug");

  if (fetchErr) {
    console.error("Failed to fetch existing slugs:", fetchErr.message);
    process.exit(1);
  }

  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));
  const newCount = rows.filter((r) => !existingSlugs.has(r.slug)).length;
  const skipCount = rows.length - newCount;

  // Upsert all rows — safe to run repeatedly
  const { error: upsertErr } = await supabase
    .from("perfumes")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: false });

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Done — ${rows.length} perfumes processed`);
  console.log(`  Inserted : ${newCount}`);
  console.log(`  Updated  : ${skipCount}`);
}

main();
