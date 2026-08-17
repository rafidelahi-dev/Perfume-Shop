import { fragranceCatalog, type PerfumeCatalogEntry } from "../lib/fragrance-catalog";

export type GenderLean = "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine";

export type PerfumeSeedEntry = {
  slug: string;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  accords: string[];
  search_terms: string[];
  gender_lean: GenderLean;
  house_description: string;
};

// Hand-authored, verified profiles for widely-recognized fragrances. Every entry
// not listed here falls back to the heuristic generator below — both paths always
// carry search_terms straight from the catalog, so listings matching never breaks.
const CURATED: Record<string, Omit<PerfumeSeedEntry, "slug" | "search_terms">> = {
  "afnan-9pm": {
    top_notes: ["pear", "bergamot", "saffron"],
    heart_notes: ["vanilla orchid", "almond", "coffee"],
    base_notes: ["cedarwood", "tonka bean", "vanilla"],
    accords: ["sweet", "vanilla", "spicy", "gourmand"],
    gender_lean: "masculine",
    house_description:
      "Afnan's breakout gourmand-oriental, built around a dense vanilla-almond-coffee heart. One of the most recognized budget fragrances in Bangladesh, often reached for as an evening, cool-weather scent.",
  },
  "lattafa-yara": {
    top_notes: ["pear", "orange blossom", "mandarin"],
    heart_notes: ["jasmine", "tuberose", "orange blossom"],
    base_notes: ["vanilla", "musk", "sandalwood"],
    accords: ["floral", "sweet", "fruity", "musky"],
    gender_lean: "feminine",
    house_description:
      "Lattafa's best-selling women's fruity-floral gourmand — soft, sweet, and long-lasting, positioned as an affordable alternative to designer white-floral bestsellers.",
  },
  "armaf-club-de-nuit-intense-man": {
    top_notes: ["pineapple", "blackcurrant", "apple", "bergamot"],
    heart_notes: ["birch", "patchouli", "jasmine"],
    base_notes: ["musk", "oakmoss", "ambergris"],
    accords: ["fruity", "woody", "smoky", "fresh"],
    gender_lean: "masculine",
    house_description:
      "Armaf's most famous release, widely known in Bangladesh as an accessible take on a blockbuster fruity-chypre structure — sharp pineapple-birch opening settling into a smoky, ambery base.",
  },
  "rasasi-hawas": {
    top_notes: ["bergamot", "pink pepper", "cardamom"],
    heart_notes: ["geranium", "lavender", "sage"],
    base_notes: ["leather", "oud", "amberwood"],
    accords: ["woody", "spicy", "leather", "aromatic"],
    gender_lean: "masculine",
    house_description:
      "A sharp, confident Rasasi men's fragrance layering spicy aromatic top notes over a leather-oud base — a common recommendation for office-to-evening wear.",
  },
  "rasasi-la-yuqawam": {
    top_notes: ["cardamom", "cinnamon", "saffron"],
    heart_notes: ["agarwood (oud)", "rose", "leather"],
    base_notes: ["amber", "musk", "oud"],
    accords: ["oud", "spicy", "amber", "woody"],
    gender_lean: "masculine",
    house_description:
      "One of Rasasi's flagship oud-oriental releases — rich spice and rose over a deep resinous oud base, aimed squarely at the region's love of dense amber-oud fragrances.",
  },
  "dior-sauvage": {
    top_notes: ["calabrian bergamot", "pepper"],
    heart_notes: ["sichuan pepper", "lavender", "pink pepper", "vetiver", "patchouli", "geranium", "elemi"],
    base_notes: ["ambroxan", "cedar", "labdanum"],
    accords: ["fresh", "spicy", "aromatic", "woody", "amber"],
    gender_lean: "masculine",
    house_description:
      "Dior's global bestseller — a fresh, peppery bergamot opening over a signature ambroxan-cedar base. The most universally recognized designer fragrance among Bangladeshi buyers.",
  },
  "ysl-y-eau-de-parfum": {
    top_notes: ["apple", "ginger", "bergamot"],
    heart_notes: ["sage", "geranium"],
    base_notes: ["tonka bean", "cedar", "vetiver", "incense", "amberwood"],
    accords: ["aromatic", "woody", "fresh", "sweet"],
    gender_lean: "masculine",
    house_description:
      "YSL's modern aromatic-woody signature scent — a crisp apple-ginger opening resolving into a warm, slightly sweet tonka-vetiver base. A popular step-up gift choice.",
  },
  "tom-ford-oud-wood": {
    top_notes: ["rosewood", "cardamom", "chinese pepper"],
    heart_notes: ["oud", "sandalwood", "palisander rosewood"],
    base_notes: ["vanilla", "tonka bean", "amber"],
    accords: ["oud", "woody", "amber", "sweet", "smoky"],
    gender_lean: "unisex",
    house_description:
      "The fragrance that brought oud into mainstream Western perfumery — smooth, smoky, and sweetened by vanilla and amber rather than the sharper medicinal oud found in traditional attars.",
  },
  "tom-ford-black-orchid": {
    top_notes: ["black truffle", "ylang-ylang", "bergamot", "black currant"],
    heart_notes: ["orchid", "spicy notes", "lotus", "fruity notes"],
    base_notes: ["patchouli", "vanilla", "incense", "amber", "sandalwood", "dark chocolate"],
    accords: ["sweet", "woody", "amber", "floral"],
    gender_lean: "unisex",
    house_description:
      "A dark, opulent gourmand-floral with a distinctive truffle-and-chocolate undertone — one of Tom Ford's most polarizing but iconic releases, worn confidently by both men and women.",
  },
  "tom-ford-tobacco-vanille": {
    top_notes: ["tobacco leaf", "spicy notes"],
    heart_notes: ["tonka bean", "vanilla", "cacao", "dried fruits"],
    base_notes: ["woody notes", "amber"],
    accords: ["sweet", "spicy", "woody", "amber"],
    gender_lean: "unisex",
    house_description:
      "A cold-weather gourmand built on sweet tobacco leaf and vanilla — one of the most-decanted Tom Ford Private Blend fragrances due to strong projection and longevity.",
  },
  "creed-aventus": {
    top_notes: ["pineapple", "blackcurrant", "apple", "bergamot"],
    heart_notes: ["birch", "patchouli", "moroccan jasmine", "rose"],
    base_notes: ["musk", "oakmoss", "ambergris", "vanilla"],
    accords: ["fruity", "smoky", "woody", "fresh"],
    gender_lean: "masculine",
    house_description:
      "The most-referenced niche fragrance in the world of clones and inspirations (Armaf Club de Nuit among them) — smoky birch and pineapple over a musky, ambery base originally composed for Creed's 250th anniversary.",
  },
  "armaf-club-de-nuit-woman": {
    top_notes: ["pear", "mandarin", "raspberry"],
    heart_notes: ["jasmine", "may rose", "apricot"],
    base_notes: ["patchouli", "vanilla", "musk", "amber"],
    accords: ["fruity", "floral", "sweet", "musky"],
    gender_lean: "feminine",
    house_description:
      "The women's counterpart to Armaf's Club de Nuit line — a fruity-floral built on the same crowd-pleasing sweetness that made the men's Intense Man a bestseller.",
  },
};

type NotePool = { top: string[]; heart: string[]; base: string[] };

const ACCORD_NOTE_POOLS: Record<string, NotePool> = {
  oud: { top: ["saffron", "cardamom"], heart: ["oud", "rose"], base: ["amber", "sandalwood"] },
  woody: { top: ["bergamot"], heart: ["cedar", "vetiver"], base: ["sandalwood", "musk"] },
  amber: { top: ["cinnamon"], heart: ["labdanum"], base: ["amber", "benzoin"] },
  sweet: { top: ["pear"], heart: ["vanilla orchid"], base: ["vanilla", "tonka bean"] },
  vanilla: { top: ["pear"], heart: ["praline"], base: ["vanilla", "tonka bean"] },
  gourmand: { top: ["almond"], heart: ["caramel"], base: ["vanilla", "musk"] },
  spicy: { top: ["pink pepper", "cardamom"], heart: ["cinnamon"], base: ["clove"] },
  leather: { top: ["saffron"], heart: ["leather"], base: ["suede", "amber"] },
  smoky: { top: ["pepper"], heart: ["incense"], base: ["oud", "birch"] },
  tobacco: { top: ["spicy notes"], heart: ["tobacco leaf"], base: ["dried fruits", "amber"] },
  fresh: { top: ["bergamot", "lemon"], heart: ["marine notes"], base: ["musk"] },
  aquatic: { top: ["sea notes", "mint"], heart: ["water lily"], base: ["ambroxan"] },
  citrus: { top: ["bergamot", "mandarin"], heart: ["neroli"], base: ["white musk"] },
  aromatic: { top: ["lavender"], heart: ["sage", "geranium"], base: ["vetiver"] },
  green: { top: ["galbanum"], heart: ["violet leaf"], base: ["vetiver"] },
  floral: { top: ["mandarin"], heart: ["jasmine", "rose"], base: ["musk"] },
  fruity: { top: ["pear", "blackcurrant"], heart: ["apricot"], base: ["musk"] },
  musky: { top: ["mandarin"], heart: ["iris"], base: ["white musk", "cedar"] },
  powdery: { top: ["violet"], heart: ["iris"], base: ["musk"] },
};

const FEMININE_HINTS = [
  "woman", "her", "flora", "lady", "girl", "cherie", "angel", "rose petals",
  "petals", "peach", "silver scent", "libre",
];

type AccordRule = { keywords: string[]; accords: string[] };

const ACCORD_RULES: AccordRule[] = [
  { keywords: ["oud"], accords: ["oud", "woody", "amber", "smoky"] },
  { keywords: ["rose", "petal"], accords: ["floral", "musky", "powdery"] },
  { keywords: ["musk"], accords: ["musky", "sweet", "powdery"] },
  { keywords: ["tobacco"], accords: ["tobacco", "sweet", "woody"] },
  { keywords: ["leather"], accords: ["leather", "woody", "smoky"] },
  { keywords: ["silver", "blue", "aqua", "water", "ice", "cool"], accords: ["fresh", "aquatic", "citrus"] },
  { keywords: ["gold", "amber"], accords: ["amber", "sweet", "spicy"] },
  { keywords: ["black", "night", "noir", "dark"], accords: ["woody", "smoky", "spicy"] },
  { keywords: ["vanilla", "gourmand", "choco", "praline"], accords: ["sweet", "vanilla", "gourmand"] },
  { keywords: ["sport", "intense", "extreme", "energy"], accords: ["fresh", "aromatic", "woody"] },
  { keywords: ["flora", "flower", "jasmine", "peach", "cherie", "bloom"], accords: ["floral", "fruity", "sweet"] },
  { keywords: ["neroli", "citrus", "orange"], accords: ["citrus", "fresh", "floral"] },
  { keywords: ["green"], accords: ["green", "aromatic", "fresh"] },
];

function pickAccords(name: string, brand: string): string[] {
  const haystack = `${brand} ${name}`.toLowerCase();
  for (const rule of ACCORD_RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) return rule.accords;
  }
  // Regional attar/oriental houses (Lattafa, Al Haramain, Maison Alhambra, Orientica,
  // Rasasi, Afnan, Armaf) default to an oriental-woody profile when no keyword hits —
  // that's the dominant style across their unlisted SKUs.
  const orientalHouses = ["lattafa", "al haramain", "maison alhambra", "orientica", "rasasi", "afnan", "armaf", "fragrance world", "al rehab", "la rive"];
  if (orientalHouses.some((h) => brand.toLowerCase().includes(h))) {
    return ["woody", "amber", "spicy", "sweet"];
  }
  return ["woody", "fresh", "aromatic"];
}

function pickGenderLean(name: string, brand: string): GenderLean {
  const haystack = `${brand} ${name}`.toLowerCase();
  return FEMININE_HINTS.some((h) => haystack.includes(h)) ? "feminine" : "masculine";
}

function buildNotes(accords: string[]): { top: string[]; heart: string[]; base: string[] } {
  const top = new Set<string>();
  const heart = new Set<string>();
  const base = new Set<string>();
  for (const accord of accords) {
    const pool = ACCORD_NOTE_POOLS[accord];
    if (!pool) continue;
    pool.top.forEach((n) => top.add(n));
    pool.heart.forEach((n) => heart.add(n));
    pool.base.forEach((n) => base.add(n));
  }
  return { top: [...top], heart: [...heart], base: [...base] };
}

function generateSeedEntry(entry: PerfumeCatalogEntry): PerfumeSeedEntry {
  const curated = CURATED[entry.slug];
  if (curated) {
    return { slug: entry.slug, search_terms: entry.searchTerms, ...curated };
  }

  const accords = pickAccords(entry.name, entry.brand);
  const genderLean = pickGenderLean(entry.name, entry.brand);
  const { top, heart, base } = buildNotes(accords);

  return {
    slug: entry.slug,
    top_notes: top,
    heart_notes: heart,
    base_notes: base,
    accords,
    search_terms: entry.searchTerms,
    gender_lean: genderLean,
    house_description: `${entry.name} from ${entry.brand} — a ${accords.join("/")} fragrance. Profile pending admin review.`,
  };
}

export const perfumeProfileSeedData: PerfumeSeedEntry[] = fragranceCatalog.map(generateSeedEntry);
