import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://cloudperfumebd.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: profiles }, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null),
    supabase
      .from("listings")
      .select("id, updated_at, profiles!inner(username)")
      .order("created_at", { ascending: false }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/perfumes`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const profilePages: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p) => p.username)
    .map((p) => ({
      url: `${SITE_URL}/perfumes/${p.username}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const listingPages: MetadataRoute.Sitemap = (listings ?? [])
    .filter((l) => {
      const p = l.profiles as unknown as { username: string } | null;
      return p?.username;
    })
    .map((l) => {
      const p = l.profiles as unknown as { username: string };
      return {
        url: `${SITE_URL}/perfumes/${p.username}/${l.id}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });

  return [...staticPages, ...profilePages, ...listingPages];
}
