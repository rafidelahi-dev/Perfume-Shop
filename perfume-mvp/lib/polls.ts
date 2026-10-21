// Poll catalog. Mirrors public.poll_options (the DB is the enforcement point;
// this drives labels and order in the UI).

export type PollKind = "single" | "yes_no";

export type PollDimension = {
  key: string;
  title: string;
  kind: PollKind;
  /** Hex used for this poll's bars and highlights. */
  accent: string;
  /** "spectrum" renders ordered options as a sky track (day to night). */
  variant?: "spectrum";
  options: { value: string; label: string; icon?: string }[];
};

export const POLLS: PollDimension[] = [
  {
    key: "timeofday",
    accent: "#6366f1",
    title: "Day or night?",
    kind: "single",
    variant: "spectrum",
    options: [
      { value: "day", label: "Daytime", icon: "sun" },
      { value: "leans_day", label: "Leans day", icon: "sunset" },
      { value: "anytime", label: "Either", icon: "sunmoon" },
      { value: "leans_night", label: "Leans night", icon: "cloudmoon" },
      { value: "night", label: "Nighttime", icon: "moon" },
    ],
  },
  {
    key: "gender",
    accent: "#8b5cf6",
    title: "Gender lean",
    kind: "single",
    options: [
      { value: "very_masculine", label: "Very masc." },
      { value: "masculine", label: "Masculine" },
      { value: "unisex", label: "Unisex" },
      { value: "feminine", label: "Feminine" },
      { value: "very_feminine", label: "Very fem." },
    ],
  },
  {
    key: "longevity",
    accent: "#f59e0b",
    title: "Longevity",
    kind: "single",
    options: [
      { value: "0-2h", label: "0–2h" },
      { value: "2-5h", label: "2–5h" },
      { value: "5-7h", label: "5–7h" },
      { value: "7-10h", label: "7–10h" },
      { value: "10h+", label: "10h+" },
    ],
  },
  {
    key: "projection",
    accent: "#ec4899",
    title: "Projection",
    kind: "single",
    options: [
      { value: "skin", label: "Skin-close" },
      { value: "moderate", label: "Moderate" },
      { value: "strong", label: "Strong" },
      { value: "beast", label: "Beast mode" },
    ],
  },
  {
    key: "value",
    accent: "#10b981",
    title: "Value for price",
    kind: "single",
    options: [
      { value: "overpriced", label: "Overpriced" },
      { value: "fair", label: "Fair" },
      { value: "good_value", label: "Good value" },
      { value: "steal", label: "A steal" },
    ],
  },
  {
    key: "climate",
    accent: "#0ea5e9",
    title: "Works in Bangladesh weather?",
    kind: "yes_no",
    options: [
      { value: "hot_summer", label: "Hot summer", icon: "sun" },
      { value: "humid_rainy", label: "Humid / rainy", icon: "rain" },
      { value: "winter", label: "Winter", icon: "snow" },
      { value: "mild", label: "Mild (spring / autumn)", icon: "leaf" },
    ],
  },
  {
    key: "place",
    accent: "#f97316",
    title: "Where can you wear it?",
    kind: "yes_no",
    options: [
      { value: "bus_metro", label: "Bus / metro", icon: "bus" },
      { value: "ac_room", label: "AC room / office", icon: "building" },
      { value: "restaurant", label: "Restaurant", icon: "dining" },
      { value: "outdoors", label: "Outdoors / street", icon: "bike" },
      { value: "wedding_event", label: "Wedding / event", icon: "gem" },
      { value: "jummah_eid", label: "Jummah / Eid", icon: "mosque" },
    ],
  },
];

/** Below this many distinct voters a poll shows an empty state instead of bars. */
export const MIN_VOTERS_FOR_RESULTS = 3;

export type PollCounts = Record<string, Record<string, { yes: number; no: number }>>;

export type UserVote = { dimension: string; option: string; value: 1 | -1 };

export const RATING_LABELS: Record<number, string> = {
  1: "Hate it",
  2: "Not for me",
  3: "It's okay",
  4: "Like it",
  5: "Love it",
};
