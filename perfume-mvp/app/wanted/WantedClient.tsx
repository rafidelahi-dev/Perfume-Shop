"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import { closeWanted, createWanted, type WantedRequest } from "@/lib/queries/engagement";
import { formatTaka, timeAgo, typeLabel } from "@/lib/listingUtils";

const TYPES = [
  { value: "", label: "Any" },
  { value: "decant", label: "Decant" },
  { value: "partial", label: "Partial" },
  { value: "intact", label: "Full bottle" },
];

const field =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20";

export default function WantedClient({ requests }: { requests: WantedRequest[] }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthProfile();
  const userId = useSessionUserId();
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const shown = needle ? requests.filter((r) => r.perfume_text.toLowerCase().includes(needle)) : requests;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true);
    try {
      await createWanted({
        perfume_text: text,
        type: type || null,
        max_price: maxPrice ? Number(maxPrice) : null,
        note: note || null,
      });
      toast.success("Posted. Sellers can now message you.");
      setText("");
      setType("");
      setMaxPrice("");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post your request.");
    } finally {
      setBusy(false);
    }
  }

  async function close(id: string) {
    try {
      await closeWanted(id);
      toast.success("Request closed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close the request.");
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <section className="bg-gradient-to-br from-[#f9f6ef] via-[#f5f1e8] to-[#efe9dc] pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#111] sm:text-5xl">
            Looking for a perfume?
          </h1>
          <p className="mt-3 max-w-xl text-[#444]">
            Post what you want. Sellers who have it message you directly. Free, takes a minute.
          </p>

          {isAuthenticated ? (
            <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <label htmlFor="w-text" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                  Which perfume?
                </label>
                <input
                  id="w-text"
                  className={field}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Creed Aventus 10ml decant"
                  maxLength={100}
                  required
                />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-[#1a1a1a]">Type</legend>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      aria-pressed={type === t.value}
                      className={`min-h-[40px] rounded-full border px-4 text-sm font-medium transition ${
                        type === t.value
                          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                          : "border-black/10 bg-white hover:border-[#d4af37]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w-price" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                    Budget in ৳ <span className="font-normal text-[#888]">(optional)</span>
                  </label>
                  <input
                    id="w-price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className={field}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label htmlFor="w-note" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                    Note <span className="font-normal text-[#888]">(optional)</span>
                  </label>
                  <input
                    id="w-note"
                    className={field}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Batch code, city, etc."
                    maxLength={300}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || text.trim().length < 2}
                className="min-h-[44px] w-full rounded-full bg-[#1a1a1a] px-6 text-sm font-medium text-white transition hover:bg-[#d4af37] hover:text-[#1a1a1a] disabled:opacity-50 sm:w-auto"
              >
                {busy ? "Posting…" : "Post my request"}
              </button>
            </form>
          ) : (
            <Link
              href="/signup?next=/wanted"
              className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-[#1a1a1a] px-7 text-sm font-medium text-white transition hover:bg-[#d4af37] hover:text-[#1a1a1a]"
            >
              Sign up to post a request
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
          <input
            className={`${field} pl-12`}
            placeholder="Search wanted posts…"
            aria-label="Search wanted posts"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {shown.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-serif text-2xl text-[#1a1a1a]">
              {requests.length === 0 ? "No wanted posts yet" : "No match"}
            </p>
            <p className="mt-2 text-[#666]">
              {requests.length === 0 ? "Be the first to ask." : "Try fewer words."}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {shown.map((r) => {
              const p = r.profiles;
              const mine = !!userId && userId === r.user_id;
              const posted = timeAgo(r.created_at);
              return (
                <li key={r.id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">{r.perfume_text}</h2>
                      <p className="mt-1 text-sm text-[#666]">
                        {r.type ? typeLabel(r.type) : "Any type"}
                        {r.max_price != null ? ` · up to ${formatTaka(Number(r.max_price))}` : ""}
                        {posted ? ` · ${posted}` : ""}
                      </p>
                      {r.note && <p className="mt-2 text-sm text-[#444]">{r.note}</p>}
                      <p className="mt-2 text-xs text-[#888]">Asked by {p?.display_name ?? p?.username ?? "a member"}</p>
                    </div>
                    {mine && (
                      <button
                        type="button"
                        onClick={() => close(r.id)}
                        className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-black/10 px-3 text-xs text-[#555] hover:bg-gray-50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" /> Close
                      </button>
                    )}
                  </div>

                  {!mine && p && (p.whatsapp_number || p.messenger_link || p.contact_number) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.whatsapp_number && (
                        <a
                          href={`https://wa.me/${p.whatsapp_number}?text=${encodeURIComponent(`Hi, I have ${r.perfume_text}. Saw your wanted post on Cloud PerfumeBD.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-green-500 px-5 text-sm font-medium text-white hover:bg-green-600"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> I have this
                        </a>
                      )}
                      {p.messenger_link && (
                        <a
                          href={p.messenger_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-medium text-white hover:bg-blue-600"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Messenger
                        </a>
                      )}
                      {p.contact_number && (
                        <a
                          href={`tel:${p.contact_number}`}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gray-800 px-5 text-sm font-medium text-white hover:bg-gray-900"
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" /> Call
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Footer />
    </div>
  );
}
