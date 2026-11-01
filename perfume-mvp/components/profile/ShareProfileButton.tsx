"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export default function ShareProfileButton({ name, username }: { name: string; username: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/perfumes/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name}'s perfumes | CloudPerfumeBD`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-11 items-center gap-2 rounded-full bg-[#d4af37] px-4 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#c29f2f]"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
