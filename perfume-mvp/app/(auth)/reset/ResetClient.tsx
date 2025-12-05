"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1) When we arrive with ?token_hash=...&type=recovery, verify it
  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!token_hash || type !== "recovery") {
      // normal "request link" mode
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);
      setMsg("Verifying reset link…");

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });

      setLoading(false);

      if (error) {
        console.error("verifyOtp error", error);
        setErr(error.message || "Invalid or expired reset link.");
        setMsg(null);
        setMode("request");
        return;
      }

      if (data.session?.user?.email) {
        setMode("update");
        setMsg(null);
      } else {
        setErr("Could not start reset session. Please request a new link.");
        setMode("request");
      }
    })();
  }, [searchParams]);

  // 2) Request reset link
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for a reset link.");
  }

  // 3) After link verified → set new password
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Password updated. Redirecting…");
      setTimeout(() => router.replace("/login"), 1500);
    }
  }

  const isRequestMode = mode === "request";

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      {isRequestMode ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Reset password</h2>
          <form onSubmit={handleRequest} className="space-y-3">
            <input
              type="email"
              className="w-full border rounded p-2"
              placeholder="Your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-green-700">{msg}</p>}
            <button
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">Set a new password</h2>
          <form onSubmit={handleUpdate} className="space-y-3">
            <input
              type="password"
              minLength={6}
              required
              className="w-full border rounded p-2"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-green-700">{msg}</p>}
            <button
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
