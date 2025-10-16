"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect if this is an incoming password-recovery link
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user && data.session.user.email) {
        // Supabase will automatically sign in with a recovery session
        setMode("update");
      }
    });

    // Optional extra safety: react to PASSWORD_RECOVERY event
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // STEP 1: request reset link
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${location.origin}/reset` // same page
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for a reset link.");
  }

  // STEP 2: update password after link click
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setErr(error.message);
    else {
      setMsg("Password updated. You can now log in.");
      // Optional redirect after short delay
      setTimeout(() => router.replace("/login"), 1500);
    }
  }

  // ───────── UI ─────────
  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      {mode === "request" ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Reset password</h2>
          <form onSubmit={handleRequest} className="space-y-3">
            <input
              className="w-full border rounded p-2"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-green-700">{msg}</p>}
            <button
              className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
              disabled={loading}
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
              className="w-full border rounded p-2"
              type="password"
              placeholder="New password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-green-700">{msg}</p>}
            <button
              className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
