"use client";

import Link from "next/link";
import { BellRing, Heart, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import {
  deleteAlert,
  fetchMyAlerts,
  fetchMyFollows,
  setFollowSeller,
  type FollowedSeller,
  type PerfumeAlert,
} from "@/lib/queries/engagement";
import { timeAgo } from "@/lib/listingUtils";

type Hit = {
  id: string;
  brand: string | null;
  perfume_name: string | null;
  type: string | null;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
};

const key = (userId?: string | null) => ["alerts-overview", userId] as const;

const HIT_SELECT = "id, brand, perfume_name, type, created_at, profiles:profiles!inner(username)";

// PostgREST .or() breaks on these characters in user text.
const clean = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();

async function loadOverview() {
  const [alerts, follows] = await Promise.all([fetchMyAlerts(), fetchMyFollows()]);

  const alertHits = await Promise.all(
    alerts.map(async (a) => {
      const q = clean(a.query);
      const { data } = await supabase
        .from("listings")
        .select(HIT_SELECT)
        .eq("is_hidden", false)
        .eq("status", "available")
        .gt("created_at", a.last_seen_at)
        .or(`perfume_name.ilike.%${q}%,brand.ilike.%${q}%,sub_brand.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(5);
      return { alert: a, hits: (data ?? []) as unknown as Hit[] };
    })
  );

  const followHits = await Promise.all(
    follows.map(async (f) => {
      const { data } = await supabase
        .from("listings")
        .select(HIT_SELECT)
        .eq("user_id", f.seller_id)
        .eq("is_hidden", false)
        .eq("status", "available")
        .gt("created_at", f.last_seen_at)
        .order("created_at", { ascending: false })
        .limit(5);
      return { follow: f, hits: (data ?? []) as unknown as Hit[] };
    })
  );

  return { alertHits, followHits };
}

const userOf = (h: Hit) => (Array.isArray(h.profiles) ? h.profiles[0]?.username : h.profiles?.username);

function HitList({ hits }: { hits: Hit[] }) {
  if (hits.length === 0) return <p className="mt-2 text-sm text-gray-500">Nothing new yet.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {hits.map((h) => (
        <li key={h.id}>
          <Link
            href={`/perfumes/${userOf(h)}/${h.id}`}
            className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#fffaf0] px-4 py-2 text-sm hover:border-[#d4af37]"
          >
            <span className="min-w-0 truncate font-medium text-[#1a1a1a]">
              {h.brand} {h.perfume_name}
              <span className="ml-2 font-normal capitalize text-gray-500">{h.type}</span>
            </span>
            <span className="shrink-0 text-xs text-[#8a6d00]">{timeAgo(h.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AlertsPage() {
  const userId = useSessionUserId();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: key(userId),
    queryFn: loadOverview,
    enabled: !!userId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key(userId) });

  const removeAlert = useMutation({
    mutationFn: (a: PerfumeAlert) => deleteAlert(a.id),
    onSuccess: () => {
      refresh();
      toast.success("Alert removed.");
    },
  });
  const unfollow = useMutation({
    mutationFn: (f: FollowedSeller) => setFollowSeller(f.seller_id, false),
    onSuccess: () => {
      refresh();
      toast.success("Unfollowed.");
    },
  });
  const markSeen = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("perfume_alerts").update({ last_seen_at: now }).eq("user_id", userId!),
        supabase.from("seller_follows").update({ last_seen_at: now }).eq("follower_id", userId!),
      ]);
    },
    onSuccess: () => {
      refresh();
      toast.success("Marked as seen.");
    },
  });

  const total =
    (data?.alertHits.reduce((n, a) => n + a.hits.length, 0) ?? 0) +
    (data?.followHits.reduce((n, f) => n + f.hits.length, 0) ?? 0);

  return (
    <section className="mt-4 md:mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold sm:text-2xl">Alerts &amp; following</h2>
          <p className="mt-1 text-xs text-gray-600">
            New sell posts that match your alerts or come from sellers you follow.
          </p>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => markSeen.mutate()}
            className="min-h-[44px] rounded-full border border-black/10 px-5 text-sm font-medium hover:bg-gray-50"
          >
            Mark all seen
          </button>
        )}
      </div>

      {isLoading || userId === undefined ? (
        <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      ) : error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load your alerts. Refresh and try again.
        </p>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <BellRing className="h-5 w-5 text-[#8a6d00]" aria-hidden="true" /> Perfume alerts
            </h3>
            {data!.alertHits.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                None yet. Search for a perfume on{" "}
                <Link href="/perfumes" className="underline">
                  Sell Post
                </Link>{" "}
                and tap “Notify me” when nothing shows up.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {data!.alertHits.map(({ alert, hits }) => (
                  <li key={alert.id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#1a1a1a]">“{alert.query}”</p>
                      <button
                        type="button"
                        onClick={() => removeAlert.mutate(alert)}
                        aria-label={`Remove alert ${alert.query}`}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <HitList hits={hits} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <Heart className="h-5 w-5 text-[#8a6d00]" aria-hidden="true" /> Sellers you follow
            </h3>
            {data!.followHits.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                Not following anyone. Tap “Follow seller” on any sell post.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {data!.followHits.map(({ follow, hits }) => (
                  <li key={follow.seller_id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/perfumes/${follow.profiles?.username ?? ""}`}
                        className="font-medium text-[#1a1a1a] hover:text-[#8a6d00]"
                      >
                        {follow.profiles?.display_name ?? follow.profiles?.username ?? "Seller"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => unfollow.mutate(follow)}
                        className="min-h-[44px] rounded-full px-4 text-sm text-gray-500 hover:bg-gray-50"
                      >
                        Unfollow
                      </button>
                    </div>
                    <HitList hits={hits} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
