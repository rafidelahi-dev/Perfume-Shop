"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ReviewInsert } from "@/lib/queries/reviews";
import ComboBox from "@/components/ComboBox";
import { usePerfumeAutocomplete } from "@/lib/hooks/usePerfumeAutocomplete";

const CATEGORIES = [
  "Floral", "Woody", "Oriental/Amber", "Fresh", "Aromatic",
  "Fougere", "Chypre", "Gourmand", "Leather", "Citrus", "Other",
];

const WEAR_OPTIONS = ["Winter", "Spring", "Summer", "Fall", "Day", "Night"];

const RATINGS: { value: ReviewInsert["rating"]; label: string; emoji: string; color: string }[] = [
  { value: "love",    label: "Love",    emoji: "❤️",  color: "bg-red-100 border-red-400 text-red-700" },
  { value: "like",    label: "Like",    emoji: "👍",  color: "bg-green-100 border-green-400 text-green-700" },
  { value: "okay",    label: "Okay",    emoji: "😐",  color: "bg-yellow-100 border-yellow-400 text-yellow-700" },
  { value: "dislike", label: "Dislike", emoji: "👎",  color: "bg-orange-100 border-orange-400 text-orange-700" },
  { value: "hate",    label: "Hate",    emoji: "💀",  color: "bg-gray-100 border-gray-400 text-gray-700" },
];

const GENDERS: { value: ReviewInsert["gender"]; label: string }[] = [
  { value: "very_masculine", label: "Very Masc." },
  { value: "masculine",      label: "Masculine" },
  { value: "unisex",         label: "Unisex" },
  { value: "feminine",       label: "Feminine" },
  { value: "very_feminine",  label: "Very Fem." },
];

const LONGEVITIES: { value: ReviewInsert["longevity"]; label: string }[] = [
  { value: "0-2h",  label: "0–2h" },
  { value: "2-5h",  label: "2–5h" },
  { value: "5-7h",  label: "5–7h" },
  { value: "7-10h", label: "7–10h" },
  { value: "10h+",  label: "10h+" },
];

type Props = {
  form: ReviewInsert;
  setForm: React.Dispatch<React.SetStateAction<ReviewInsert>>;
  onSubmit: (e: React.FormEvent) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  upLoading: boolean;
  error: string | null;
};

export default function ReviewForm({
  form,
  setForm,
  onSubmit,
  onUpload,
  saving,
  upLoading,
  error,
}: Props) {
  const [genderIdx, setGenderIdx] = useState<number | null>(
    form.gender ? GENDERS.findIndex((g) => g.value === form.gender) : null
  );

  const { brandSuggestions, nameSuggestions, onNameSelect } =
    usePerfumeAutocomplete();

  function toggleWear(option: string) {
    const lower = option.toLowerCase();
    setForm((f) => ({
      ...f,
      when_to_wear: f.when_to_wear.includes(lower)
        ? f.when_to_wear.filter((w) => w !== lower)
        : [...f.when_to_wear, lower],
    }));
  }

  function removeImage(url: string) {
    setForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 mb-6"
    >
      {/* Required fields header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Review Details</h3>
        <p className="text-xs text-gray-500">Fields marked with * are required</p>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Perfume Image *
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.images.map((url) => (
            <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="review" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-500 hover:bg-gray-50 transition-colors">
          <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
          {upLoading ? "Uploading…" : "Upload images"}
        </label>
      </div>

      {/* Brand + Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <ComboBox
            label="Brand"
            placeholder="e.g. Dior"
            value={form.brand}
            onChange={(val) => setForm((f) => ({ ...f, brand: val }))}
            suggestions={brandSuggestions(form.brand)}
            required
            inputClassName="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <ComboBox
            label="Perfume Name"
            placeholder="e.g. Sauvage EDP"
            value={form.perfume_name}
            onChange={(val) => setForm((f) => ({ ...f, perfume_name: val }))}
            onSelect={(name) => {
              const backfill = onNameSelect(name, form.brand);
              setForm((f) => ({ ...f, brand: backfill.brand }));
            }}
            suggestions={nameSuggestions(form.brand, form.perfume_name)}
            required
            inputClassName="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      {/* Category + Sub-category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sub-category <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.sub_category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, sub_category: e.target.value || null }))}
            placeholder="e.g. Fresh Floral"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      {/* Review text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Review <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.review_text ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value || null }))}
          placeholder="Write your thoughts about this fragrance…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, rating: f.rating === r.value ? null : r.value }))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                form.rating === r.value
                  ? r.color + " border-2 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
              }`}
            >
              <span>{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* When to wear */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          When to Wear <span className="text-gray-400 font-normal">(optional, pick multiple)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {WEAR_OPTIONS.map((opt) => {
            const lower = opt.toLowerCase();
            const selected = form.when_to_wear.includes(lower);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleWear(opt)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  selected
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600 hover:border-gray-400 bg-gray-50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gender <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex items-center gap-1">
          {GENDERS.map((g, idx) => (
            <button
              key={g.value}
              type="button"
              onClick={() => {
                const newIdx = genderIdx === idx ? null : idx;
                setGenderIdx(newIdx);
                setForm((f) => ({ ...f, gender: newIdx !== null ? GENDERS[newIdx].value : null }));
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded border transition-all text-center ${
                genderIdx === idx
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400 bg-gray-50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>Masculine</span>
          <span>Feminine</span>
        </div>
      </div>

      {/* Longevity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Longevity <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {LONGEVITIES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, longevity: f.longevity === l.value ? null : l.value }))
              }
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                form.longevity === l.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400 bg-gray-50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || upLoading}
        className="rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-[#f8f7f3] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
      >
        {saving ? "Saving…" : "Save Review"}
      </button>
    </form>
  );
}
