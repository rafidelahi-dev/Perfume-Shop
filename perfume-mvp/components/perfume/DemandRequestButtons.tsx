"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitDemandRequest } from "@/lib/queries/perfumes";

type Props = { perfumeId: string };

export default function DemandRequestButtons({ perfumeId }: Props) {
  const [pending, setPending] = useState<"notify" | "decant" | null>(null);
  const [sent, setSent] = useState<Set<"notify" | "decant">>(new Set());

  async function handleClick(type: "notify" | "decant") {
    if (pending || sent.has(type)) return;
    setPending(type);
    try {
      await submitDemandRequest(perfumeId, type);
      setSent((prev) => new Set(prev).add(type));
      toast.success("Got it — we'll reach out when it's back.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      <button
        onClick={() => handleClick("notify")}
        disabled={pending !== null || sent.has("notify")}
        className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] text-sm hover:opacity-90 disabled:opacity-50"
      >
        {sent.has("notify") ? "We'll notify you" : "Notify Me"}
      </button>
      <button
        onClick={() => handleClick("decant")}
        disabled={pending !== null || sent.has("decant")}
        className="rounded-xl border border-[#1a1a1a] px-5 py-2.5 text-[#1a1a1a] text-sm hover:bg-[#1a1a1a] hover:text-[#f8f7f3] disabled:opacity-50"
      >
        {sent.has("decant") ? "Decant request sent" : "Request a Decant"}
      </button>
    </div>
  );
}
