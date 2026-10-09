"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { createAlert } from "@/lib/queries/engagement";

// Shown when a search finds nothing: turns a dead end into a saved alert.
export default function NotifyMeCard({ query }: { query: string }) {
  const { isAuthenticated } = useAuthProfile();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const q = query.trim();
  if (q.length < 2) return null;

  async function save() {
    setBusy(true);
    try {
      await createAlert(q);
      setSaved(true);
      toast.success(`We'll flag new "${q}" posts in your dashboard.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-3xl border border-[#d4af37]/30 bg-[#fffaf0] p-6 text-center">
      <BellRing className="mx-auto h-6 w-6 text-[#8a6d00]" aria-hidden="true" />
      <p className="mt-3 font-serif text-xl text-[#1a1a1a]">Nobody has posted “{q}” yet</p>
      <p className="mt-1 text-sm text-[#666]">Get it flagged in your dashboard the moment someone does.</p>
      {saved ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8a6d00]">
          <Check className="h-4 w-4" /> Alert saved
        </p>
      ) : isAuthenticated ? (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-4 min-h-[44px] rounded-full bg-[#1a1a1a] px-6 text-sm font-medium text-white transition hover:bg-[#d4af37] hover:text-[#1a1a1a] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Notify me"}
        </button>
      ) : (
        <Link
          href="/signup?next=/perfumes"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#1a1a1a] px-6 text-sm font-medium text-white transition hover:bg-[#d4af37] hover:text-[#1a1a1a]"
        >
          Sign up to get notified
        </Link>
      )}
      <p className="mt-4 text-xs text-[#888]">
        Or{" "}
        <Link href="/wanted" className="underline hover:text-[#8a6d00]">
          post a wanted request
        </Link>{" "}
        so sellers can find you.
      </p>
    </div>
  );
}
