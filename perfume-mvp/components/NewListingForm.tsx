"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function NewListingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [quantityMl, setQuantityMl] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // TODO: replace perfume_id and user_id with real values after auth is wired
      const { error } = await supabase.from("listings").insert({
        title,
        quantity_ml: quantityMl,
        price,
      });
      if (error) throw error;
      router.push("/perfumes");
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          className="mt-1 w-full rounded-md border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dior Sauvage 10ml decant"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Quantity (ml)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border p-2"
            value={quantityMl}
            onChange={(e) => setQuantityMl(Number(e.target.value))}
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Price</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border p-2"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            min={0}
            step="0.01"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-md bg-gray-900 text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Create Listing"}
      </button>
    </form>
  );
}
