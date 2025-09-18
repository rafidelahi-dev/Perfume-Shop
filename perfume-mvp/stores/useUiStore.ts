import { create } from "zustand";

type Filters = {
  brand: string;
  q: string;
};

type UiState = {
  isFilterOpen: boolean;
  toggleFilter: () => void;

  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isFilterOpen: false,
  toggleFilter: () => set((s) => ({ isFilterOpen: !s.isFilterOpen })),
  filters: { brand: "", q: "" },
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { brand: "", q: "" } }),
}));
