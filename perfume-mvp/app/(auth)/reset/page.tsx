"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    const redirectTo = typeof window !== "undefined" ? `${location.origin}` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) setErr(error.message);
    else setMsg("Check your email for a reset link.");
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Reset password</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button className="w-full bg-gray-900 text-white rounded p-2">Send reset link</button>
      </form>
    </div>
  );
}
