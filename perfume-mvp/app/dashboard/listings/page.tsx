"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

async function fetchMyListings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function insertListing(values: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("listings").insert({
    user_id: user.id,
    ...values,
  });
  if (error) throw error;
}

export default function MyListingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    bottle_type: "intact",
    decant_ml: "",
    price: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["my_listings"],
    queryFn: fetchMyListings,
  });

  const mutation = useMutation({
    mutationFn: insertListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_listings"] });
      setForm({ title: "", bottle_type: "intact", decant_ml: "", price: "" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">My Listings</h2>

      {/* Add new listing */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white border rounded-lg p-4"
      >
        <input
          className="border rounded p-2"
          placeholder="Listing title (e.g. Dior Sauvage 10ml decant)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <select
          className="border rounded p-2"
          value={form.bottle_type}
          onChange={(e) => setForm({ ...form, bottle_type: e.target.value })}
        >
          <option value="intact">Intact</option>
          <option value="full">Full Bottle</option>
          <option value="partial">Partial</option>
          <option value="decant">Decant</option>
        </select>

        {form.bottle_type === "decant" && (
          <input
            type="number"
            className="border rounded p-2"
            placeholder="Decant size (ml)"
            value={form.decant_ml}
            onChange={(e) => setForm({ ...form, decant_ml: e.target.value })}
          />
        )}

        <input
          type="number"
          step="0.01"
          className="border rounded p-2"
          placeholder="Price (USD)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />

        <button
          className="col-span-full bg-gray-900 text-white rounded p-2"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Add Listing"}
        </button>
        {mutation.error && (
          <p className="text-red-600 text-sm">
            {(mutation.error as Error).message}
          </p>
        )}
      </form>

      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error loading listings.</p>}

      {/* List of user’s listings */}
      {data && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((l: any) => (
            <li key={l.id} className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold">{l.title}</h3>
              <p className="text-sm text-gray-600 capitalize">{l.bottle_type}</p>
              {l.decant_ml && (
                <p className="text-sm text-gray-500">{l.decant_ml} ml</p>
              )}
              <p className="text-lg font-semibold mt-1">${l.price}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
