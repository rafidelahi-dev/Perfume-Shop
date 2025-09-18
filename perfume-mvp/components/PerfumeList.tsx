"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useUiStore } from "@/stores/useUiStore";

async function fetchPerfumes(brand: string, q: string) {
  let query = supabase.from("perfumes").select("*").order("brand");
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (q) query = query.or(`name.ilike.%${q}%,notes.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export default function PerfumeList() {
  const { brand, q } = useUiStore((s) => s.filters);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["perfumes", { brand, q }],
    queryFn: () => fetchPerfumes(brand, q),
    staleTime: 60_000,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Failed to load.</p>;
  if (!data?.length) return <p>No perfumes found.</p>;

  return (
    <>
      <div className="mb-3">
        <button onClick={() => refetch()} className="px-3 py-2 bg-gray-800 text-white rounded-md">
          Refresh
        </button>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((p: any) => (
          <li key={p.id} className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-gray-500">{p.brand}</div>
            <div className="font-medium">{p.name}</div>
            {p.notes && <div className="mt-2 text-sm text-gray-600 line-clamp-2">{p.notes}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
