import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fragranceCatalog } from "../lib/fragrance-catalog";
import { perfumeProfileSeedData, type PerfumeSeedEntry } from "./perfume-profile-seed-data";

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const bySlug = new Map<string, PerfumeSeedEntry>(perfumeProfileSeedData.map((e) => [e.slug, e]));

  const rows = fragranceCatalog.map((entry) => {
    const seed = bySlug.get(entry.slug);
    if (!seed) {
      console.error(`Missing seed data for catalog slug: ${entry.slug}`);
      process.exit(1);
    }
    return {
      slug: entry.slug,
      name: entry.name,
      brand: entry.brand,
      meta_title: `${entry.name} in Bangladesh`,
      meta_description: entry.metaDescription,
      top_notes: seed.top_notes,
      heart_notes: seed.heart_notes,
      base_notes: seed.base_notes,
      accords: seed.accords,
      search_terms: seed.search_terms,
      gender_lean: seed.gender_lean,
      house_description: seed.house_description,
      is_verified: false,
    };
  });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: fetchErr } = await supabase.from("perfumes").select("slug");
  if (fetchErr) {
    console.error("Failed to fetch existing slugs:", fetchErr.message);
    process.exit(1);
  }
  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));
  const newCount = rows.filter((r) => !existingSlugs.has(r.slug)).length;

  const { error: upsertErr } = await supabase
    .from("perfumes")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: false });

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Done — ${rows.length} perfumes processed`);
  console.log(`  Inserted : ${newCount}`);
  console.log(`  Updated  : ${rows.length - newCount}`);
}

main();
