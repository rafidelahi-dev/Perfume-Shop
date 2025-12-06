"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetUpdatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // 1) On first load, exchange ?code=... for a session
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setErr("Reset link is invalid or expired. Please request a new link.");
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);
      setMsg("Verifying reset link…");

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      setLoading(false);

      if (error || !data.session) {
        console.error("exchangeCodeForSession error", error);
        setErr(
          error?.message ??
            "Reset link is invalid or expired. Please request a new link."
        );
        setMsg(null);
        setAllowed(false);
        return;
      }

      // We now have a valid session → allow password change
      setAllowed(true);
      setMsg(null);
    })();
  }, [searchParams]);

  // 2) Actually update the password
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
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Something went wrong.";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Set a new password</h2>

      {!allowed && !err && (
        <p className="text-sm text-gray-500">
          {loading ? "Verifying reset link…" : "Checking reset link…"}
        </p>
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
