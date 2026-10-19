// Poll catalog. Mirrors public.poll_options (the DB is the enforcement point;
// this drives labels and order in the UI).

export type PollKind = "single" | "yes_no";

export type PollDimension = {
  key: string;
  title: string;
  kind: PollKind;
  options: { value: string; label: string; emoji?: string }[];
};

export const POLLS: PollDimension[] = [
  {
    key: "gender",
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
    title: "Works in Bangladesh weather?",
    kind: "yes_no",
    options: [
      { value: "hot_summer", label: "Hot summer", emoji: "☀️" },
      { value: "humid_rainy", label: "Humid / rainy", emoji: "🌧️" },
      { value: "winter", label: "Winter", emoji: "❄️" },
      { value: "mild", label: "Mild (spring / autumn)", emoji: "🍃" },
    ],
  },
  {
    key: "place",
    title: "Where can you wear it?",
    kind: "yes_no",
    options: [
      { value: "bus_metro", label: "Bus / metro", emoji: "🚌" },
      { value: "ac_room", label: "AC room / office", emoji: "🏢" },
      { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
      { value: "outdoors", label: "Outdoors / street", emoji: "🛵" },
      { value: "wedding_event", label: "Wedding / event", emoji: "💍" },
      { value: "jummah_eid", label: "Jummah / Eid", emoji: "🕌" },
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
