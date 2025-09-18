"use client";

import Header from "@/components/Header";
import PerfumeList from "@/components/PerfumeList";
import { useUiStore } from "@/stores/useUiStore";

export default function PerfumesPage() {
  const isOpen = useUiStore((s) => s.isFilterOpen);
  const toggle = useUiStore((s) => s.toggleFilter);
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const reset = useUiStore((s) => s.resetFilters);

  return (
    <>
      <Header />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Perfumes</h2>
        <button onClick={toggle} className="px-3 py-2 rounded-md bg-gray-900 text-white">
          {isOpen ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {isOpen && (
        <div className="mb-4 rounded-lg border bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="rounded-md border p-2"
            placeholder="Brand (e.g., Dior)"
            value={filters.brand}
            onChange={(e) => setFilters({ brand: e.target.value })}
          />
          <input
            className="rounded-md border p-2"
            placeholder="Search text"
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
          />
          <button onClick={reset} className="rounded-md border px-3 py-2">
            Reset
          </button>
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        <PerfumeList />
      </div>
    </>
  );
}
