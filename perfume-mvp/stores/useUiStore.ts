// stores/useUiStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Filters = { brand: string; q: string };
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
      filters: { brand: "", q: "" },
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: { brand: "", q: "" } }),
    }),
    {
      name: "ui-store-v1", // localStorage key
      partialize: (s) => ({ filters: s.filters }), // only persist filters
    }
  )
);
