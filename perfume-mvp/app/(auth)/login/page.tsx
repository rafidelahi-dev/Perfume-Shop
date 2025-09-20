// app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push("/perfumes");
    setLoading(false);
  }

  async function signInWithOAuth(provider: "google" | "facebook") {
    try {
      setOauthLoading(provider);
      setError(null);
      // Redirect back to your site after OAuth completes:
      const redirectTo =
        typeof window !== "undefined" ? `${location.origin}` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) setError(error.message);
      // On success, user is redirected; session will be available when they return.
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Log in</h2>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded p-2"
          type="submit"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="space-y-2">
        <button
          onClick={() => signInWithOAuth("google")}
          disabled={oauthLoading === "google"}
          className="w-full border rounded p-2"
        >
          {oauthLoading === "google" ? "Connecting to Google…" : "Continue with Google"}
        </button>
        <button
          onClick={() => signInWithOAuth("facebook")}
          disabled={oauthLoading === "facebook"}
          className="w-full border rounded p-2"
        >
          {oauthLoading === "facebook" ? "Connecting to Facebook…" : "Continue with Facebook"}
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Don’t have an account?{" "}
        <Link href="/(auth)/signup" className="text-blue-600 underline">
          Sign up
        </Link>
      </p>

      <p className="mt-2 text-xs text-gray-500">
        Forgot your password?{" "}
        <Link href="/(auth)/reset" className="underline">
          Reset it
        </Link>
      </p>
    </div>
  );
}
