export const qk = {
  userPerfumes: (userId?: string | null) => ["userPerfumes", userId] as const,
  userListings: (userId?: string | null) => ["userListings", userId] as const,
  profile: (userId?: string | null) => ["profile", userId] as const,
  listings: (filters: { brand?: string; q?: string }) => ["listings", filters] as const,
  perfumes: (filters: { brand?: string; q?: string }) => ["perfumes", filters] as const,
  listingById: (id: string) => ["listing", id] as const,
  dashboardListingStats: (userId?: string | null) => ["dashboardListingStats", userId] as const,
  dashboardPerfumeStats: (userId?: string | null) => ["dashboardPerfumeStats", userId] as const,
};
