// stores/useUiStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Filters = { brand: string; q: string; priceMin: number | null; priceMax: number | null };
type UiState = {
  isFilterOpen: boolean;
  toggleFilter: () => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isFilterOpen: false,
      toggleFilter: () => set((s) => ({ isFilterOpen: !s.isFilterOpen })),
      filters: { brand: "", q: "", priceMin: null, priceMax: null },
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () =>
        set({ filters: { brand: "", q: "", priceMin: null, priceMax: null } }),
    }),
    {
      name: "ui-store-v1",
      partialize: (s) => ({ filters: s.filters }),
    }
  )
);
