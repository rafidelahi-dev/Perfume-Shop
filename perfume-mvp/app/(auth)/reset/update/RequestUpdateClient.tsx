"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";

export default function ResetUpdateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // supabase-js uses PKCE: the reset link lands here as ?code=..., which
  // must be exchanged for a session — it isn't auto-detected like the old
  // hash-fragment flow. Supabase also appends ?error_description=... here
  // directly (no code) when the link itself is already expired/used.
  useEffect(() => {
    let cancelled = false;
    const code = searchParams.get("code");
    const errorDescription = searchParams.get("error_description");

    if (errorDescription) {
      setErr(errorDescription.replace(/\+/g, " "));
      return;
    }

    if (!code) {
      setErr("Reset link is invalid or expired. Please request a new link.");
      return;
    }

    withTimeout(
      supabase.auth.exchangeCodeForSession(code),
      4000,
      { data: { session: null, user: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.exchangeCodeForSession>
      >
    ).then(({ data, error }) => {
      if (cancelled) return;

      if (error || !data.session) {
        setErr("Reset link is invalid or expired. Please request a new link.");
      } else {
        setAllowed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErr(error.message);
      } else {
        setMsg("Password updated. Redirecting…");
        setTimeout(() => router.replace("/login"), 1500);
      }
    } catch (e) {
      const errObj = e as Error;
      setErr(errObj.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Set a new password</h2>

      {!allowed && !err && (
        <p className="text-sm text-gray-500">Checking reset link…</p>
      )}

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {allowed && (
        <form onSubmit={handleUpdate} className="space-y-3">
          <input
            type="password"
            minLength={6}
            required
            className="w-full border rounded p-2"
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {msg && <p className="text-sm text-green-700">{msg}</p>}

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
