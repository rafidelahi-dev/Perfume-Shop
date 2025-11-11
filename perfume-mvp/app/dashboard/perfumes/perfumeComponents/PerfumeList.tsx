"use client";

import { useMemo, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

export type Perfume = {
  id: string;
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];      // first image used as the card thumb
  created_at: string;    // ISO string
};

type Props = {
  items: Perfume[];
  isLoading: boolean;
  error?: unknown;
  onEdit: (item: Perfume) => void;
  onDelete: (id: string) => void;
};

export default function PerfumeList({
  items,
  isLoading,
  error,
  onEdit,
  onDelete,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      [p.brand, p.sub_brand ?? "", p.name]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-44 skeleton-shimmer"/>
            <Skeleton className="h-9 w-28 rounded-full skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
              <div className="h-40 animate-pulse bg-black/10" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-black/10" />
                <div className="h-4 w-32 animate-pulse rounded bg-black/10" />
                <div className="h-3 w-full animate-pulse rounded bg-black/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load perfumes. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your perfumes…"
          className="w-full sm:w-1/2 rounded-xl border border-black/10 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
          {search
            ? <>No perfumes match “{search}”.</>
            : <>No perfumes yet — add your first one above.</>}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="group rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-50 to-rose-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.images?.[0] || ""}
                  alt={`${p.brand} ${p.name}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="text-xs uppercase tracking-wide text-[#c08a00]">
                  {p.brand}{p.sub_brand ? ` • ${p.sub_brand}` : ""}
                </div>
                <h4 className="mt-1 font-semibold text-[#111] line-clamp-1">{p.name}</h4>

                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <Sparkles className="h-3 w-3" />
                    Added {new Date(p.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(p)}
                      className="rounded-full border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="rounded-full border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
