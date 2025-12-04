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
  const [checkingLink, setCheckingLink] = useState(true);

  // When user comes from email link: /reset?code=...&type=recovery
  useEffect(() => {
    const code = searchParams.get("code");
    const type = searchParams.get("type");

    // If there is no code in the URL, just show "request" mode
    if (!code) {
      setCheckingLink(false);
      return;
    }

    // Only treat recovery links
    if (type && type !== "recovery") {
      setCheckingLink(false);
      return;
    }

    (async () => {
      setCheckingLink(true);
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("exchangeCodeForSession error:", error);
        setErr(error.message);
        setMode("request"); // fall back to request form
      } else if (data.session?.user) {
        setMode("update");

        // Clean the URL so refresh doesn't re-exchange the code
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          url.searchParams.delete("type");
          window.history.replaceState({}, document.title, url.toString());
        }
      }

      setCheckingLink(false);
    })();
  }, [searchParams]);

  // STEP 1 — request reset link
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

  // STEP 2 — actually set new password
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

  // While we are exchanging the code, show a small loading state
  if (checkingLink && searchParams.get("code")) {
    return (
      <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
        <p className="text-sm text-gray-600">Verifying reset link…</p>
      </div>
    );
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
