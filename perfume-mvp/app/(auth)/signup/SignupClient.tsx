"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactNumber, setContactNumber] = useState(""); // optional
  const [agree, setAgree] = useState(false);

  const [checking, setChecking] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] =
    useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Username normalization directly in onChange (no useMemo/useEffect loop)
  function handleUsernameChange(raw: string) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setUsername(normalized);
    setUsernameOk(null);
  }

  async function checkAvailability(u: string) {
    if (!u || u.length < 3) {
      setUsernameOk(null);
      return;
    }
    setChecking(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", u)
      .limit(1);
    setChecking(false);
    setUsernameOk(!data?.length && !error);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agree) {
      setError("You must agree to the Terms and Privacy Policy.");
      setLoading(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
          display_name: displayName,
          contact_number: contactNumber,
        },
      },
    });

    if (signErr) {
      console.error("signUp error:", signErr);
      setError(signErr.message);
      setLoading(false);
      return;
    }

    // On success – send them to perfumes (you can later make this respect ?next=)
    router.push("/perfumes");
    setLoading(false);
  }

  async function signInWithOAuth(provider: "google" | "facebook") {
    try {
      setOauthLoading(provider);
      setError(null);
      const redirectTo =
        typeof window !== "undefined" ? `${location.origin}` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) setError(error.message);
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">Create account</h2>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Password (min 6)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Username (letters, numbers, _)"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          onBlur={() => checkAvailability(username)}
          required
        />
        {checking && (
          <p className="text-xs text-gray-500">Checking username…</p>
        )}
        {usernameOk === false && (
          <p className="text-xs text-red-600">Username is taken</p>
        )}
        {usernameOk === true && (
          <p className="text-xs text-green-700">Username available</p>
        )}

        <input
          className="w-full border rounded p-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Display name (shown publicly)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Contact Number"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          I agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Sign up"}
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
          {oauthLoading === "google"
            ? "Connecting to Google…"
            : "Continue with Google"}
        </button>
        <button
          onClick={() => signInWithOAuth("facebook")}
          disabled={oauthLoading === "facebook"}
          className="w-full border rounded p-2"
        >
          {oauthLoading === "facebook"
            ? "Connecting to Facebook…"
            : "Continue with Facebook"}
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
