"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";

export default function JoinBar({ username }: { username: string }) {
  const userId = useSessionUserId();
  const [dismissed, setDismissed] = useState(false);

  // undefined = still checking, string = signed in; only show for confirmed logged-out visitors.
  if (userId !== null || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d4af37]/40 bg-[#15130d] px-4 py-3 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <p className="flex-1 text-sm text-[#e9dba5]">Selling perfumes? Get your own Seller Pass, free.</p>
        <Link
          href={`/signup?next=/perfumes/${username}`}
          className="flex min-h-11 items-center rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#15130d]"
        >
          Get your card
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex h-11 w-11 items-center justify-center text-[#9a9a9a]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
