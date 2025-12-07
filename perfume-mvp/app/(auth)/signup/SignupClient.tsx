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
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [agree, setAgree] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const [checking, setChecking] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
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
          username,
          display_name: displayName,
          full_name: fullName,
          contact_number: contactNumber,
          whatsappNumber: whatsappNumber,
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

    router.push("/verify-email");
    setLoading(false);
  }

  async function signInWithOAuth(provider: "google") {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#DFC738] p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Join Us Today</h1>
          <p className="text-white text-sm">Create your account in seconds</p>
        </div>

        <div className="p-6">
          {/* OAuth Buttons - Prominently placed */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => signInWithOAuth("google")}
              disabled={oauthLoading === "google"}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {oauthLoading === "google" ? "Connecting..." : "Continue with Google"}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-gray-500">or with email</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Required Fields - Compact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Password (min 6)"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={() => checkAvailability(username)}
                    required
                  />
                  {checking && (
                    <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
                  )}
                  {usernameOk === false && (
                    <p className="text-xs text-red-600 mt-1">Username taken</p>
                  )}
                  {usernameOk === true && (
                    <p className="text-xs text-green-600 mt-1">Username available</p>
                  )}
                </div>

                <input
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Optional Fields - Collapsible */}
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Additional information (optional). You don't have to fill these informations now but it is suggested that you do it, so have better experience in connecting with the communitiy </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showOptional ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 10-10-10" />
                </svg>
              </button>
              
              {showOptional && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  <p className="text-xs text-gray-500 mb-2">
                    You can change these later in your profile settings.
                  </p>
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Whatsapp Number"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Contact number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Facebook profile link"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Messenger chat link"
                    value={messengerLink}
                    onChange={(e) => setMessengerLink(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <label className="flex items-start gap-3 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-gray-900 hover:underline font-medium">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="text-gray-900 hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-[#d4af37] text-white rounded-lg p-3 font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-gray-900 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}