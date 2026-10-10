"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Boxes,
  Check,
  Circle,
  EyeOff,
  Library,
  Plus,
  Star,
  Tag,
  Wallet,
} from "lucide-react";
import { fetchMyPerfumes } from "@/lib/queries/userPerfumes";
import { fetchMyListings } from "@/lib/queries/listings";
import { fetchMyReviews } from "@/lib/queries/reviews";
import { fetchMyProfile } from "@/lib/queries/profile";
import { qk } from "@/lib/queries/key";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";

type ListingRow = {
  id: string;
  brand: string | null;
  perfume_name: string | null;
  type: "intact" | "partial" | "decant" | null;
  price: number | null;
  min_price: number | null;
  partial_left_ml: number | null;
  bottle_size_ml: number | null;
  images: string[] | null;
  is_hidden: boolean;
  is_flagged: boolean;
  status?: string | null;
  created_at: string | null;
};

const TYPE_META = {
  intact: { label: "Intact", bar: "bg-[#1a1a1a]", dot: "bg-[#1a1a1a]" },
  partial: { label: "Partial", bar: "bg-[#d4af37]", dot: "bg-[#d4af37]" },
  decant: { label: "Decant", bar: "bg-[#b9a98a]", dot: "bg-[#b9a98a]" },
} as const;

const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Kpi({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: typeof Tag;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#666]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#8a6d00]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-serif text-3xl font-semibold tabular-nums text-[#1a1a1a]">{value}</p>
      <p className="mt-1 text-xs text-[#888]">{hint}</p>
    </div>
  );
}

export default function DashboardOverview() {
  const userId = useSessionUserId();

  const perfumesQuery = useQuery({
    queryKey: qk.dashboardPerfumeStats(userId),
    queryFn: fetchMyPerfumes,
    enabled: !!userId,
  });
  const listingsQuery = useQuery({
    queryKey: qk.dashboardListingStats(userId),
    queryFn: fetchMyListings,
    enabled: !!userId,
  });
  const reviewsQuery = useQuery({
    queryKey: qk.dashboardReviewStats(userId),
    queryFn: fetchMyReviews,
    enabled: !!userId,
  });
  const profileQuery = useQuery({
    queryKey: qk.profile(userId),
    queryFn: fetchMyProfile,
    enabled: !!userId,
  });

  const isLoading =
    perfumesQuery.isLoading || listingsQuery.isLoading || reviewsQuery.isLoading || profileQuery.isLoading;
  const hasError = perfumesQuery.error || listingsQuery.error || reviewsQuery.error;

  if (hasError) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="font-serif text-xl text-red-800">Failed to load dashboard data</p>
        <p className="mt-1 text-sm text-red-700">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => {
            perfumesQuery.refetch();
            listingsQuery.refetch();
            reviewsQuery.refetch();
          }}
          className="mt-4 min-h-[44px] rounded-full bg-red-700 px-6 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 animate-pulse" aria-busy="true">
        <div className="h-40 rounded-3xl bg-black/5" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-black/5" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-black/5" />
      </div>
    );
  }

  const profile = profileQuery.data;
  const listings = (listingsQuery.data ?? []) as ListingRow[];
  const reviews = reviewsQuery.data ?? [];
  const collection = perfumesQuery.data ?? [];

  const live = listings.filter((l) => !l.is_hidden && !l.is_flagged && l.status !== "sold");
  const hidden = listings.filter((l) => l.is_hidden || l.is_flagged);
  const soldCount = listings.filter((l) => l.status === "sold").length;
  const askingValue = live.reduce(
    (sum, l) => (l.type === "decant" ? sum : sum + Number(l.price ?? 0)),
    0
  );
  const mix = (["intact", "partial", "decant"] as const).map((t) => ({
    t,
    n: live.filter((l) => l.type === t).length,
  }));
  const rated = reviews.filter((r) => r.rating != null);
  const avgRating = rated.length
    ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length
    : null;

  const name = profile?.display_name?.trim() || "there";
  const hasContact = !!(profile?.contact_number || profile?.whatsapp_number || profile?.messenger_link || profile?.facebook_link);
  const withPhotos = live.filter((l) => (l.images?.length ?? 0) > 0).length;

  const checklist = [
    { done: !!profile?.avatar_url && !!profile?.bio, label: "Add a photo and bio", hint: "Buyers trust sellers with a face and a story.", href: "/dashboard/profile" },
    { done: hasContact, label: "Add a way to contact you", hint: "WhatsApp, Messenger or phone. Buyers message you directly.", href: "/dashboard/profile" },
    { done: !!profile?.phone_verified, label: "Verify your phone", hint: "Shows a verified badge on your listings.", href: "/dashboard/profile" },
    { done: listings.length > 0, label: "Post your first listing", hint: "Takes about a minute.", href: "/dashboard/listings" },
    { done: live.length > 0 && withPhotos === live.length, label: "Add photos to every listing", hint: "Listings with photos get opened far more.", href: "/dashboard/listings" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const nextStep = checklist.find((c) => !c.done);

  const recent = listings.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#1a1a1a] p-6 text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d4af37]/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-white/60">{greeting()}</p>
            <h1 className="mt-1 truncate font-serif text-3xl font-semibold sm:text-4xl">{name}</h1>
            <p className="mt-3 max-w-md text-sm text-white/70">
              {live.length > 0
                ? `${live.length} ${live.length === 1 ? "listing is" : "listings are"} live${
                    askingValue > 0 ? ` with ${taka(askingValue)} in asking value.` : "."
                  }`
                : "Your shop is empty. Post your first bottle and buyers can find you."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard/listings"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f0d675] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d675]"
            >
              <Plus className="h-4 w-4" aria-hidden /> New listing
            </Link>
            <Link
              href="/dashboard/listings?type=partial"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d675]"
            >
              Drop a partial
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Shop numbers">
        <Kpi label="Live listings" value={String(live.length)} hint={`${listings.length} total posted`} Icon={Tag} />
        <Kpi
          label="Asking value"
          value={taka(askingValue)}
          hint="Intact and partial bottles"
          Icon={Wallet}
        />
        <Kpi
          label="Avg. rating given"
          value={avgRating ? avgRating.toFixed(1) : "–"}
          hint={`${reviews.length} ${reviews.length === 1 ? "review" : "reviews"} written`}
          Icon={Star}
        />
        <Kpi
          label="Collection"
          value={String(collection.length)}
          hint="Bottles in your shelf"
          Icon={Library}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Inventory + recent */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">Inventory mix</h2>
              <Boxes className="h-4 w-4 text-[#8a6d00]" aria-hidden />
            </div>
            {live.length === 0 ? (
              <p className="mt-4 text-sm text-[#666]">No live listings yet. Your mix shows up here.</p>
            ) : (
              <>
                <div
                  className="mt-4 flex h-3 overflow-hidden rounded-full bg-black/5"
                  role="img"
                  aria-label={mix.map((m) => `${m.n} ${TYPE_META[m.t].label}`).join(", ")}
                >
                  {mix.map(
                    (m) =>
                      m.n > 0 && (
                        <div
                          key={m.t}
                          className={TYPE_META[m.t].bar}
                          style={{ width: `${(m.n / live.length) * 100}%` }}
                        />
                      )
                  )}
                </div>
                <ul className="mt-4 grid grid-cols-3 gap-3">
                  {mix.map((m) => (
                    <li key={m.t}>
                      <p className="flex items-center gap-2 text-sm text-[#666]">
                        <span className={`h-2.5 w-2.5 rounded-full ${TYPE_META[m.t].dot}`} aria-hidden />
                        {TYPE_META[m.t].label}
                      </p>
                      <p className="mt-0.5 font-serif text-2xl font-semibold tabular-nums text-[#1a1a1a]">{m.n}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {soldCount > 0 && (
              <p className="mt-4 rounded-xl bg-[#f6f4ee] px-3 py-2 text-xs text-[#555]">
                {soldCount} {soldCount === 1 ? "post" : "posts"} marked sold. Sold posts stay visible on the feed but don&apos;t count as live.
              </p>
            )}
            {hidden.length > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#f6f4ee] px-3 py-2 text-xs text-[#555]">
                <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {hidden.length} {hidden.length === 1 ? "listing is" : "listings are"} hidden or flagged and not visible to buyers.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6">
              <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">Recent listings</h2>
              <Link
                href="/dashboard/listings"
                className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[#8a6d00] hover:underline"
              >
                Manage all <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="px-6 pb-8 pt-2 text-center">
                <p className="text-sm text-[#666]">Nothing posted yet.</p>
                <Link
                  href="/dashboard/listings"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-[#1a1a1a] px-6 text-sm font-medium text-white hover:bg-[#333]"
                >
                  Post your first listing
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-black/5 pb-2">
                {recent.map((l) => {
                  const meta = l.type ? TYPE_META[l.type] : null;
                  const shown = l.type === "decant" ? l.min_price : l.price;
                  const off = l.is_hidden || l.is_flagged;
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f6f4ee]">
                        {l.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1a1a1a]">{l.perfume_name}</p>
                        <p className="truncate text-xs text-[#888]">
                          {l.brand} · {timeAgo(l.created_at)}
                          {l.type === "partial" && l.partial_left_ml ? ` · ${l.partial_left_ml}ml left` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-[#1a1a1a]">
                          {l.type === "decant" && shown ? "from " : ""}
                          {shown != null ? taka(Number(shown)) : "–"}
                        </p>
                        <p className="text-xs text-[#888]">
                          {off ? "Hidden" : meta?.label}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Setup / health */}
        <section className="h-fit rounded-3xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">Shop readiness</h2>
            <span className="text-sm font-semibold tabular-nums text-[#8a6d00]">{pct}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-black/5"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Shop readiness"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f0d675] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          {nextStep ? (
            <p className="mt-3 text-sm text-[#666]">Next: {nextStep.label.toLowerCase()}.</p>
          ) : (
            <p className="mt-3 text-sm text-[#666]">All set. Your shop is ready for buyers.</p>
          )}
          <ul className="mt-4 space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex min-h-[44px] items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-[#f6f4ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37]"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      c.done ? "bg-[#d4af37] text-[#1a1a1a]" : "border border-black/20 text-transparent"
                    }`}
                  >
                    {c.done ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
                    <span className="sr-only">{c.done ? "Done" : "To do"}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${c.done ? "text-[#999] line-through" : "text-[#1a1a1a]"}`}>
                      {c.label}
                    </span>
                    {!c.done && <span className="block text-xs text-[#888]">{c.hint}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
