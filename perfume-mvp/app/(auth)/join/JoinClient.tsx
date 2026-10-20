"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/queries/client/auth";
import { withTimeout } from "@/lib/queries/auth";
import { fireCompleteRegistration } from "@/lib/trackRegistration";

type Props = { nextPath: string; title?: string; subtitle?: string };

/**
 * Two-tap join for people who just want to rate or vote: Google, or a phone
 * number and a code. No username, name or password; the account is created
 * (and a username generated) on first sign-in.
 */
export default function JoinClient({
  nextPath,
  title = "Join in seconds",
  subtitle = "Rate fragrances and vote. No password needed.",
}: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "code">("start");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    withTimeout(
      supabase.auth.getSession(),
      4000,
      { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>
    ).then(({ data: { session } }) => {
      if (session) router.replace(nextPath);
    });
  }, [nextPath, router]);

  async function google() {
    setGoogleBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}${nextPath}` },
    });
    if (error) {
      setError(error.message);
      setGoogleBusy(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await sendPhoneOtp(phone);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await verifyPhoneOtp(phone, code);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    fireCompleteRegistration({ phone });
    router.replace(nextPath);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1a1a1a] p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>

        <div className="p-6 space-y-5">
          {step === "start" ? (
            <>
              <button
                onClick={google}
                disabled={googleBusy}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {googleBusy ? "Connecting..." : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or with your phone</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <form onSubmit={sendCode} className="space-y-3">
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Phone number (01XXXXXXXXX)"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <button
                  disabled={busy}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#333] disabled:opacity-60"
                  type="submit"
                >
                  {busy ? "Sending…" : "Send me a code"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <p className="text-sm text-gray-600">Enter the 6-digit code sent to {phone}.</p>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="------"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button
                disabled={busy || code.length < 6}
                className="w-full bg-[#1a1a1a] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#333] disabled:opacity-60"
                type="submit"
              >
                {busy ? "Checking…" : "Continue"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("start");
                  setCode("");
                  setError(null);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-900"
              >
                Use a different number
              </button>
            </form>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            Have a password?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="font-medium text-gray-900 hover:underline"
            >
              Log in
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
