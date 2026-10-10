// app/dashboard/profile/page.tsx (with mobile improvements)
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import {
  fetchMyProfile,
  updateMyProfile,
  changeMyPassword,
  type Profile,
} from "@/lib/queries/profile";
import { uploadToBucket } from "@/lib/queries/storage";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  Check,
  ExternalLink,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<Profile>>({});
  const [pwd, setPwd] = useState({ newPwd: "", confirmPwd: "" });
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showContactOtp, setShowContactOtp] = useState(false);
  const [contactOtp, setContactOtp] = useState("");

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: qk.profile(userId),
    queryFn: fetchMyProfile,
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        contact_number: profile.contact_number ?? "",
        messenger_link: profile.messenger_link ?? "",
        facebook_link: profile.facebook_link ?? "",
        whatsapp_number: profile.whatsapp_number ?? "",
        website: profile.website ?? "",
        location: profile.location ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await withTimeout(
        supabase.auth.getUser(),
        4000,
        { data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>
      );
      setUserId(data.user?.id || null);
    };
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImgUploading(true);

    try {
      const [url] = await uploadToBucket("avatars", [file]);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Avatar uploaded successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload avatar";
      toast.error(message);
    } finally {
      setImgUploading(false);
      e.target.value = "";
    }
  };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await updateMyProfile(form);
      await qc.invalidateQueries({ queryKey: qk.profile(userId) });
      toast.success("Profile updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (pwd.newPwd.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (pwd.newPwd !== pwd.confirmPwd) {
      toast.error("Passwords do not match");
      return;
    }

    setPwdSaving(true);

    try {
      await changeMyPassword(pwd.newPwd);
      toast.success("Password updated successfully");
      setPwd({ newPwd: "", confirmPwd: "" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    } finally {
      setPwdSaving(false);
    }
  }

  function openDeleteModal() {
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      // 🔒 Just make sure the user is logged in for UX purposes
      const { data, error } = await withTimeout(
        supabase.auth.getUser(),
        4000,
        { data: { user: null }, error: null } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>
      );

      if (error || !data.user) {
        setDeleteError("You are not logged in.");
        setDeleteLoading(false);
        return;
      }

      // ✅ No need to send a token; the API route will read cookies itself
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete account.");
      }

      await withTimeout(supabase.auth.signOut({ scope: "local" }), 4000, undefined);
      setDeleteModalOpen(false);
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error.";
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading)
    return (
      <div className="mx-auto flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#d4af37]" aria-hidden="true" />
        <p className="font-medium text-[#555]">Loading your profile…</p>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-4 lg:mx-auto">
        <div className="flex items-center gap-3 text-red-800">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-sm">!</span>
          </div>
          <p className="font-medium">Failed to load profile</p>
        </div>
        <p className="text-red-600 text-sm mt-2">
          Please try refreshing the page.
        </p>
      </div>
    );

  if (!profile) return null;

  function normalizeBDPhone(input: string){
    const raw = input.trim().replace(/\s+/g, "");

    if(raw.startsWith("+")) return raw;

    if(/^01\d{9}$/.test(raw)) return `+88${raw}`;
    
    if(/^8801\d{9}$/.test(raw)) return `+${raw}`

    return raw;
  }

  function isValidBDPhone(phone: string){
    return /^\+8801\d{9}$/.test(phone.trim());
  }

  const contactNumberRaw = form.contact_number ?? "";
  const contactNumber = normalizeBDPhone(contactNumberRaw);
  const contactOk = isValidBDPhone(contactNumber);

  async function handleVerifyContactNumber() {
    try {
      if (!form.contact_number) {
        toast.error("Please enter a contact number first.");
        return;
      }

      const phone = normalizeBDPhone(form.contact_number);
      
      if(!isValidBDPhone(phone)){
        toast.error("Please enter a valid Bangladeshi Contact Number.")
        return;
      }

      const res = await fetch("/api/send-contact-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const body = await res.json();

      if (!res.ok) {
        toast.error(body.error || "Failed to send verification code.");
        return;
      }

      toast.success("Verification code sent via SMS (if gateway accepted).");
      setShowContactOtp(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send verification code.");
    }
  }

  async function handleConfirmContactOtp() {
    try {
      if (!form.contact_number) {
        toast.error("Contact number is missing.");
        return;
      }
      if (!contactOtp) {
        toast.error("Please enter the OTP you received.");
        return;
      }

      const res = await fetch("/api/confirm-contact-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizeBDPhone(form.contact_number),
          otp: contactOtp,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        toast.error(body.error || "Invalid or expired code.");
        return;
      }

      toast.success("Phone number verified!");

      setShowContactOtp(false);
      setContactOtp("");

      // Refresh profile from Supabase so phone_verified updates
      await qc.invalidateQueries({ queryKey: qk.profile(userId) });
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify code. Please try again.");
    }
  }

  

  const initials = (form.display_name || profile.username || "?").trim().charAt(0).toUpperCase();

  const formKeys = [
    "display_name",
    "contact_number",
    "messenger_link",
    "facebook_link",
    "whatsapp_number",
    "website",
    "location",
    "bio",
    "avatar_url",
  ] as const;
  const dirty = formKeys.some((k) => (form[k] ?? "") !== (profile[k] ?? ""));

  const strength = [
    { done: !!form.avatar_url, hint: "Add a profile photo" },
    { done: !!form.display_name?.trim(), hint: "Add a display name" },
    { done: !!form.location?.trim(), hint: "Say where you sell from" },
    { done: !!form.bio?.trim(), hint: "Write a short bio" },
    { done: !!profile.phone_verified, hint: "Verify your phone number" },
    {
      done: !!(form.whatsapp_number || form.facebook_link || form.messenger_link),
      hint: "Add WhatsApp, Messenger or Facebook",
    },
  ];
  const doneCount = strength.filter((x) => x.done).length;
  const pct = Math.round((doneCount / strength.length) * 100);
  const nextStep = strength.find((x) => !x.done);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 sm:space-y-8">
      {/* Identity hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#1a1a1a] text-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.30),transparent_60%)]"
        />
        <div className="relative flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-center sm:p-8 sm:text-left">
          <div className="relative shrink-0">
            <div className="relative h-28 w-28 overflow-hidden rounded-full bg-[#2a2a2a] ring-4 ring-[#d4af37]/70 sm:h-32 sm:w-32">
              {form.avatar_url ? (
                <Image
                  src={form.avatar_url}
                  alt="Your profile photo"
                  fill
                  sizes="128px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-serif text-5xl text-[#d4af37]">
                  {initials}
                </div>
              )}
              {imgUploading && (
                <div className="absolute inset-0 grid place-items-center bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
                </div>
              )}
            </div>
            <label
              className="absolute -bottom-1 -right-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-[#d4af37] text-[#1a1a1a] shadow-lg transition hover:bg-[#e2c14f] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white"
              title="Change photo"
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Change profile photo (JPG, PNG or WebP, max 5MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                disabled={imgUploading}
                className="sr-only"
              />
            </label>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="truncate font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {form.display_name || profile.username || "Your profile"}
              </h1>
              {profile.username && <p className="text-white/60">@{profile.username}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {form.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {form.location}
                </span>
              )}
              {profile.phone_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 px-3 py-1 text-sm text-[#f0d675]">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified seller
                </span>
              )}
            </div>
            {profile.username && (
              <Link
                href={`/perfumes/${profile.username}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#f0d675] underline-offset-4 hover:underline"
              >
                View my public page
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {/* Profile strength */}
        <div className="relative border-t border-white/10 px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Profile strength</span>
            <span className="tabular-nums text-white/70">{pct}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile strength"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b8921f] to-[#f0d675] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/60">
            {nextStep ? `Next: ${nextStep.hint}. Complete profiles earn more buyer trust.` : "Your profile is complete. Buyers can trust what they see."}
          </p>
        </div>
      </section>

      <form onSubmit={onSave} className="space-y-6 sm:space-y-8">
        {/* About you */}
        <Card icon={<UserRound className="h-5 w-5" aria-hidden="true" />} title="About you" description="What buyers see on your public page.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Display name" htmlFor="display_name" hint="Shown on your dashboard and listings.">
              <input
                id="display_name"
                className={INPUT}
                value={form.display_name ?? ""}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Your display name"
              />
            </Field>
            <Field label="Website" htmlFor="website" hint="Your perfume shop or personal site.">
              <input
                id="website"
                className={INPUT}
                inputMode="url"
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
            </Field>
            <Field label="Location" htmlFor="location" hint="Where you sell from." wide>
              <input
                id="location"
                className={INPUT}
                value={form.location ?? ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, Country"
              />
            </Field>
            <Field label="Bio" htmlFor="bio" wide>
              <textarea
                id="bio"
                className={`${INPUT} resize-none`}
                rows={4}
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Your fragrance taste, what you collect, what you love about perfume…"
                maxLength={500}
              />
              <p className="mt-1.5 text-right text-xs tabular-nums text-[#777]">{form.bio?.length || 0}/500</p>
            </Field>
          </div>
        </Card>

        {/* Contact */}
        <Card
          icon={<Phone className="h-5 w-5" aria-hidden="true" />}
          title="Reach you"
          description="Buyers contact you directly. Add at least one way to reach you."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Contact number" htmlFor="contact_number" wide>
              <div className="flex gap-3">
                <input
                  id="contact_number"
                  className={`${INPUT} min-w-0 flex-1`}
                  inputMode="tel"
                  value={form.contact_number ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                  placeholder="+8801XXXXXXXXX"
                  onBlur={() => {
                    const normalized = normalizeBDPhone(form.contact_number ?? "");
                    if (normalized !== (form.contact_number ?? "")) {
                      setForm((f) => ({ ...f, contact_number: normalized }));
                    }
                  }}
                />
                {!profile.phone_verified ? (
                  <button
                    type="button"
                    onClick={handleVerifyContactNumber}
                    disabled={!contactOk}
                    className="shrink-0 rounded-xl bg-[#1a1a1a] px-5 text-sm font-medium text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Verify
                  </button>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-sm font-medium text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Verified
                  </span>
                )}
              </div>
              {contactNumber && !contactOk && !profile.phone_verified && (
                <p className="mt-2 text-sm text-red-600">
                  Use the Bangladeshi format <b>+8801XXXXXXXXX</b>.
                </p>
              )}
              {showContactOtp && !profile.phone_verified && (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-[#faf6e8] p-4 sm:flex-row">
                  <input
                    className={`${INPUT} flex-1`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={contactOtp}
                    onChange={(e) => setContactOtp(e.target.value)}
                    placeholder="6-digit code from SMS"
                    aria-label="Verification code"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmContactOtp}
                    className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
                  >
                    Confirm code
                  </button>
                </div>
              )}
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp_number">
              <input
                id="whatsapp_number"
                className={INPUT}
                inputMode="tel"
                value={form.whatsapp_number ?? ""}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="+8801XXXXXXXXX"
              />
            </Field>
            <Field label="Messenger link" htmlFor="messenger_link">
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" aria-hidden="true" />
                <input
                  id="messenger_link"
                  className={`${INPUT} pl-11`}
                  inputMode="url"
                  value={form.messenger_link ?? ""}
                  onChange={(e) => setForm({ ...form, messenger_link: e.target.value })}
                  placeholder="https://m.me/yourname"
                />
              </div>
            </Field>
            <Field label="Facebook link" htmlFor="facebook_link" hint="Your profile or page (optional)." wide>
              <input
                id="facebook_link"
                className={INPUT}
                inputMode="url"
                value={form.facebook_link ?? ""}
                onChange={(e) => setForm({ ...form, facebook_link: e.target.value })}
                placeholder="https://www.facebook.com/your.profile"
              />
            </Field>
          </div>
        </Card>

        {/* Account (read-only) */}
        <Card icon={<Lock className="h-5 w-5" aria-hidden="true" />} title="Account" description="These can't be changed here.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <input id="email" className={`${INPUT} cursor-not-allowed bg-[#f6f4ee] text-[#666]`} value={profile.email ?? ""} disabled />
            </Field>
            <Field label="Username" htmlFor="username" hint="People can find you by this name.">
              <input id="username" className={`${INPUT} cursor-not-allowed bg-[#f6f4ee] text-[#666]`} value={profile.username ?? ""} disabled />
            </Field>
          </div>
        </Card>

        {/* Sticky save bar */}
        <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/90 px-4 py-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <p className="flex items-center gap-2 text-sm text-[#555]" aria-live="polite">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${dirty ? "bg-[#d4af37]" : "bg-emerald-500"}`}
            />
            {dirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-6 text-sm font-medium text-white transition hover:bg-[#d4af37] hover:text-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1a1a] disabled:hover:text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Security */}
      <form onSubmit={onChangePassword}>
        <Card icon={<Lock className="h-5 w-5" aria-hidden="true" />} title="Password" description="Choose a new password to keep your account secure.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="New password" htmlFor="new_password">
              <input
                id="new_password"
                type="password"
                autoComplete="new-password"
                className={INPUT}
                value={pwd.newPwd}
                onChange={(e) => setPwd({ ...pwd, newPwd: e.target.value })}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </Field>
            <Field label="Confirm password" htmlFor="confirm_password">
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                className={INPUT}
                value={pwd.confirmPwd}
                onChange={(e) => setPwd({ ...pwd, confirmPwd: e.target.value })}
                required
                placeholder="Repeat the new password"
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={pwdSaving || !pwd.newPwd || !pwd.confirmPwd}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#1a1a1a] px-6 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#1a1a1a] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#1a1a1a] sm:w-auto"
            >
              {pwdSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {pwdSaving ? "Updating…" : "Update password"}
            </button>
          </div>
        </Card>
      </form>

      {/* Danger zone: quiet until needed */}
      <section className="rounded-3xl border border-red-200/70 bg-red-50/40 p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-red-800">Delete account</h2>
            <p className="mt-1 max-w-md text-sm text-red-900/70">
              Permanently removes your account, perfumes and listings. This can't be undone.
            </p>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
          </div>
          <button
            type="button"
            onClick={openDeleteModal}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-5 text-sm font-medium text-red-700 transition hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete my account
          </button>
        </div>
      </section>

      {/* Confirmation modal */}
      <ConfirmDialog
        open={deleteModalOpen}
        onCancel={() => {
          if (!deleteLoading) setDeleteModalOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete your account?"
        description="This will permanently delete your account, perfumes, listings, and all associated data. This action cannot be undone."
        confirmLabel="Yes, delete it"
        cancelLabel="Cancel"
      />
    </div>
  );
}

// 16px text on phones so iOS doesn't zoom on focus.
const INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-[#1a1a1a] outline-none ring-2 ring-transparent transition placeholder:text-black/30 focus:border-[#d4af37] focus:ring-[#d4af37]/20 sm:text-sm";

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(0,0,0,0.18)] sm:p-8">
      <header className="mb-6 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/15 text-[#8a6d00]">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">{title}</h2>
          <p className="text-sm text-[#666]">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  wide = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#777]">{hint}</p>}
    </div>
  );
}
