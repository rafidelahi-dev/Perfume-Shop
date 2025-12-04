"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect if this is a recovery session after clicking the email link
  useEffect(() => {
    async function init() {
      // Only run in the browser
      if (typeof window === "undefined") return;

      const url = window.location.href;

      // If the URL has a `code` param, it's a recovery callback
      if (url.includes("code=")) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error("exchangeCodeForSession error:", error);
          setErr(error.message);
          return;
        }

        if (data.session?.user?.email) {
          // Now we *do* have a logged-in "recovery" session
          setMode("update");
        }
      }
    }

    init();
  }, []);

  // STEP 1 — Request link
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${location.origin}/reset`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for a reset link.");
  }

  // STEP 2 — Update password
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) setErr(error.message);
    else {
      setMsg("Password updated. Redirecting…");
      setTimeout(() => router.replace("/login"), 1500);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      {mode === "request" ? (
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
