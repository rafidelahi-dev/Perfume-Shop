"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";

// Deliberately a real app page rather than a direct link to Supabase's
// /auth/v1/verify endpoint: email link-scanners (Outlook Safe Links,
// antivirus gateways) GET every link in an email to prescan it, which
// consumes a single-use OTP token before the human ever clicks. Scanners
// fetch this URL too, but they don't execute our JS, so verifyOtp() below
// only ever runs for the real click.
export default function ResetConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || type !== "recovery") {
      setErr("Reset link is invalid or expired. Please request a new link.");
      return;
    }

    withTimeout(
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }),
      4000,
      { data: { session: null, user: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.verifyOtp>
      >
    ).then(({ data, error }) => {
      if (error || !data.session) {
        setErr("Reset link is invalid or expired. Please request a new link.");
      } else {
        router.replace("/reset/update");
      }
    });
  }, [searchParams, router]);

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Confirm password reset</h2>
      {!err && <p className="text-sm text-gray-500">Verifying reset link…</p>}
      {err && (
        <>
          <p className="text-sm text-red-600 mb-3">{err}</p>
          <Link href="/reset" className="text-sm underline">
            Request a new link
          </Link>
        </>
      )}
    </div>
  );
}
