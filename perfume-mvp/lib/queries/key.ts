export const qk={
    userPerfumes: ["user_perfumes"] as const,
    userListings: ["user_Listings"] as const,
    profile: ["profile"] as const,
    listings: (filters: {brand?: string; q?: string}) => ["listings", filters] as const,
    perfumes: (filters: {brand?: string; q?: string}) => ["perfumes", filters] as const,
    uniqueListing: (id: string) => ["listing", id] as const,
}