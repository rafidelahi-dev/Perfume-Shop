"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Flag, Heart, MessageCircle, Facebook } from "lucide-react";
import { toast } from "sonner";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import { isFollowingSeller, reportListing, setFollowSeller } from "@/lib/queries/engagement";

type Props = {
  listingId: string;
  sellerId: string;
  url: string;
  shareText: string;
  returnTo: string;
};

const btn =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#1a1a1a] transition hover:border-[#d4af37] hover:bg-[#fffaf0] disabled:opacity-60";

export default function ListingActions({ listingId, sellerId, url, shareText, returnTo }: Props) {
  const { isAuthenticated } = useAuthProfile();
  const userId = useSessionUserId();
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const isOwnListing = !!userId && userId === sellerId;

  useEffect(() => {
    if (!isAuthenticated || isOwnListing) return;
    let live = true;
    isFollowingSeller(sellerId)
      .then((v) => live && setFollowing(v))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isAuthenticated, isOwnListing, sellerId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function toggleFollow() {
    setBusy(true);
    try {
      await setFollowSeller(sellerId, !following);
      setFollowing(!following);
      toast.success(following ? "Unfollowed." : "Following. New posts show in your dashboard.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update follow.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await reportListing(listingId, reason);
      toast.success("Report sent. Our team will review this post.");
      setReporting(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  }

  const encoded = encodeURIComponent(url);
  const login = (path: string) => `${path}?next=${encodeURIComponent(returnTo)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Share this post">
        <a
          className={btn}
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`}
        >
          <MessageCircle className="h-4 w-4 text-green-600" aria-hidden="true" /> WhatsApp
        </a>
        <a
          className={btn}
          target="_blank"
          rel="noreferrer"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        >
          <Facebook className="h-4 w-4 text-blue-700" aria-hidden="true" /> Facebook
        </a>
        <button type="button" className={btn} onClick={copyLink}>
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      {!isOwnListing && (
        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated ? (
            <button type="button" className={btn} onClick={toggleFollow} disabled={busy} aria-pressed={following}>
              <Heart className={`h-4 w-4 ${following ? "fill-[#d4af37] text-[#d4af37]" : ""}`} aria-hidden="true" />
              {following ? "Following seller" : "Follow seller"}
            </button>
          ) : (
            <Link className={btn} href={login("/login")}>
              <Heart className="h-4 w-4" aria-hidden="true" /> Follow seller
            </Link>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm text-gray-500 hover:text-red-600"
              onClick={() => setReporting((v) => !v)}
              aria-expanded={reporting}
            >
              <Flag className="h-4 w-4" aria-hidden="true" /> Report this post
            </button>
          ) : (
            <Link
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm text-gray-500 hover:text-red-600"
              href={login("/login")}
            >
              <Flag className="h-4 w-4" aria-hidden="true" /> Report this post
            </Link>
          )}
        </div>
      )}

      {reporting && (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
          <label htmlFor="report-reason" className="block text-sm font-medium text-[#1a1a1a]">
            What is wrong with this post?
          </label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Fake photos, wrong price, seller unreachable, already sold…"
            className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#d4af37]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={submitReport}
              disabled={busy || !reason.trim()}
              className="min-h-[44px] rounded-full bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Send report
            </button>
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="min-h-[44px] rounded-full px-4 text-sm text-gray-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
