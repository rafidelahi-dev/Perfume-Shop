"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupClient() {
  const router = useRouter();

  // required
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  // optional (can edit later in profile)
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [messengerLink, setMessengerLink] = useState("");

  const [agree, setAgree] = useState(false);

  const [checking, setChecking] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] =
    useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // username normalization
  function handleUsernameChange(raw: string) {
    const normalized = raw
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20);
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

    if (usernameOk === false) {
      setError("That username is already taken.");
      setLoading(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // required core profile data
          username,
          display_name: displayName,

          // optional extra info (can be empty string)
          full_name: fullName,
          contact_number: contactNumber,
          facebook_link: facebookLink,
          messenger_link: messengerLink,
        },
      },
    });

    if (signErr) {
      console.error("signUp error:", signErr);
      setError(signErr.message);
      setLoading(false);
      return;
    }

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
        {/* REQUIRED FIELDS */}
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
          placeholder="Display name (shown publicly)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        {/* SEPARATOR */}
        <div className="pt-3 mt-2 border-t border-gray-200">
          <p className="mb-2 text-xs text-gray-500">
            The fields below are optional and can be changed later from your
            profile.
          </p>
        </div>

        {/* OPTIONAL FIELDS */}
        <input
          className="w-full border rounded p-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Contact number"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Facebook profile/page link (optional)"
          value={facebookLink}
          onChange={(e) => setFacebookLink(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Messenger chat link (e.g. https://m.me/username)"
          value={messengerLink}
          onChange={(e) => setMessengerLink(e.target.value)}
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
