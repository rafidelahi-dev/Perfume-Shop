import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import WantedClient from "./WantedClient";
import { WANTED_SELECT, type WantedRequest } from "@/lib/queries/engagement";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Wanted Perfumes in Bangladesh — Looking For (ISO) Posts",
  description:
    "Buyers across Bangladesh post the perfumes they are looking for. Got a decant, partial or full bottle to sell? Message them directly.",
  alternates: { canonical: "https://www.cloudperfumebd.com/wanted" },
};

async function fetchWanted(): Promise<WantedRequest[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase
    .from("wanted_requests")
    .select(WANTED_SELECT)
    .eq("is_open", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data as unknown as WantedRequest[]) ?? [];
}

export default async function WantedPage() {
  const requests = await fetchWanted();
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <WantedClient requests={requests} />
    </Suspense>
  );
}
