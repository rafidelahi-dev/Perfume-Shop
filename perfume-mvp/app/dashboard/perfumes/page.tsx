"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

async function fetchPerfumes() {
  const { data, error } = await supabase
    .from("user_perfumes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function insertPerfume(values: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("user_perfumes").insert({
    user_id: user.id,
    ...values,
  });
  if (error) throw error;
}

export default function MyPerfumesPage() {
  const [form, setForm] = useState({
    brand: "",
    name: "",
    bottle_type: "intact",
    decant_ml: "",
  });
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user_perfumes"],
    queryFn: fetchPerfumes,
  });

  const mutation = useMutation({
    mutationFn: insertPerfume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_perfumes"] });
      setForm({ brand: "", name: "", bottle_type: "intact", decant_ml: "" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">My Perfumes</h2>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white border rounded-lg p-4">
        <input
          className="border rounded p-2"
          placeholder="Brand"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          required
        />
        <input
          className="border rounded p-2"
          placeholder="Perfume name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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
        <button
          className="col-span-full bg-gray-900 text-white rounded p-2"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Add Perfume"}
        </button>
        {mutation.error && (
          <p className="text-red-600 text-sm">{(mutation.error as Error).message}</p>
        )}
      </form>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Error loading perfumes.</p>}

      {data && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p: any) => (
            <li key={p.id} className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold">{p.brand}</h3>
              <p className="text-gray-700">{p.name}</p>
              <p className="text-sm text-gray-500">
                {p.bottle_type}
                {p.decant_ml ? ` (${p.decant_ml} ml)` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
