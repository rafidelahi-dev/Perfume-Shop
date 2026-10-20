"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { normalizeBdPhone, isValidBdPhone } from "@/lib/queries/client/auth";
import { withTimeout } from "@/lib/queries/auth";
import { fireCompleteRegistration } from "@/lib/trackRegistration";
import { friendlyAuthError, isStrongPassword } from "@/lib/passwordRules";
import PasswordChecklist from "@/components/auth/PasswordChecklist";

type Props = { nextPath: string };
type Mode = "phone" | "email";

const input =
  "w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all";

/**
 * Sign up with Google, or a phone/email plus password. The phone/email is
 * verified with a one-time code before the account is usable, then the
 * password is what they log in with from then on.
 */
export default function SignupClient({ nextPath }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    withTimeout(
      supabase.auth.getSession(),
      4000,
      { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>
    ).then(({ data: { session } }) => {
      if (session) router.replace(nextPath);
    });
  }, [nextPath, router]);

  const target = mode === "phone" ? normalizeBdPhone(phone) : email.trim();

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    if (mode === "phone" && !isValidBdPhone(phone)) {
      setError("Enter a valid phone number (01XXXXXXXXX).");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Your password needs a lowercase letter, an uppercase letter, a number and a symbol.");
      return;
    }
    setBusy(true);
    const { error } =
      mode === "phone"
        ? await supabase.auth.signUp({ phone: target, password })
        : await supabase.auth.signUp({ email: target, password });
    setBusy(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } =
      mode === "phone"
        ? await supabase.auth.verifyOtp({ phone: target, token: code, type: "sms" })
        : await supabase.auth.verifyOtp({ email: target, token: code, type: "signup" });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    fireCompleteRegistration(mode === "phone" ? { phone: target } : { email: target });
    router.replace(nextPath);
  }

  async function resend() {
    setError(null);
    setNote(null);
    const { error } =
      mode === "phone"
        ? await supabase.auth.resend({ type: "sms", phone: target })
        : await supabase.auth.resend({ type: "signup", email: target });
    if (error) setError(error.message);
    else setNote("New code sent.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1a1a1a] p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm">
            {step === "code" ? "Check your " + (mode === "phone" ? "messages" : "inbox") : "Join the community in a minute"}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {step === "form" ? (
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
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="flex border border-gray-200 rounded-lg overflow-hidden" role="tablist">
                {(["phone", "email"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`flex-1 p-2.5 text-sm font-medium transition-colors ${
                      mode === m ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m === "phone" ? "Phone" : "Email"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === "phone" ? (
                  <input
                    className={input}
                    placeholder="Phone number (01XXXXXXXXX)"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-label="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                ) : (
                  <input
                    className={input}
                    placeholder="Email address"
                    type="email"
                    autoComplete="email"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                )}
                <div className="relative">
                  <input
                    className={`${input} pr-11`}
                    placeholder="Create a password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    aria-label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-700"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordChecklist password={password} />
                <button
                  disabled={busy || !isStrongPassword(password)}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#333] disabled:opacity-60"
                  type="submit"
                >
                  {busy ? "Sending code…" : `Send code to my ${mode}`}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to <strong className="break-all">{target}</strong>.
              </p>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="------"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button
                disabled={busy || code.length < 6}
                className="w-full bg-[#1a1a1a] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#333] disabled:opacity-60"
                type="submit"
              >
                {busy ? "Checking…" : "Verify and create account"}
              </button>
              <div className="flex justify-between text-xs text-gray-500">
                <button type="button" onClick={resend} className="hover:text-gray-900">
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setCode("");
                    setError(null);
                    setNote(null);
                  }}
                  className="hover:text-gray-900"
                >
                  Change {mode}
                </button>
              </div>
            </form>
          )}

          {note && <p className="text-sm text-green-700">{note}</p>}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
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
