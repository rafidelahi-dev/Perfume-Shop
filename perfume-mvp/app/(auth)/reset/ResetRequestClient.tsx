"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Two-step OTP reset, all on one page. Emailing a code (instead of a link)
// sidesteps email link-scanners that consume single-use links, and avoids
// any redirect/PKCE/hash-fragment handling.
type Step = "email" | "code";

const RESEND_COOLDOWN_S = 60;
const OTP_LENGTH = 6;

function errMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

export default function ResetRequestClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      await sendCode();
      setStep("code");
      setMsg(`We sent a ${OTP_LENGTH}-digit code to ${email.trim()}.`);
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      await sendCode();
      setMsg("New code sent. Older codes no longer work.");
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (code.length !== OTP_LENGTH) {
      setErr(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "recovery",
      });
      if (otpError) {
        setErr(
          /expired|invalid/i.test(otpError.message)
            ? "That code is wrong or expired. Check it, or request a new one."
            : otpError.message
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setErr(updateError.message);
        return;
      }

      // Recovery session was only for this change; make them log in fresh.
      await supabase.auth.signOut();
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold mb-1">Reset password</h2>
      <p className="text-sm text-gray-500 mb-4">
        {step === "email"
          ? "Enter your email and we'll send you a verification code."
          : "Enter the code we emailed you and choose a new password."}
      </p>

      {step === "email" ? (
        <form onSubmit={handleRequest} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            className="w-full border rounded p-2"
            placeholder="Your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            required
            className="w-full border rounded p-2 text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="······"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
          />
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className="w-full border rounded p-2"
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className="w-full border rounded p-2"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded p-2 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Update password"}
          </button>

          <div className="flex justify-between text-sm text-gray-600">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="underline disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setErr(null);
                setMsg(null);
              }}
              className="underline"
            >
              Change email
            </button>
          </div>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
