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

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: qk.profile,
    queryFn: fetchMyProfile,
  });

  const [form, setForm] = useState<Partial<Profile>>({});
  const [pwd, setPwd] = useState({ newPwd: "", confirmPwd: "" });
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        contact_link: profile.contact_link ?? "",
        messenger_link: profile.messenger_link ?? "",
        whatsapp_number: profile.whatsapp_number ?? "",
        website: profile.website ?? "",
        location: profile.location ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImgUploading(true);
  setErrMsg(null);

  try {
    // Reuse shared upload helper
    const [url] = await uploadToBucket("avatars", [file]);
    setForm((f) => ({ ...f, avatar_url: url }));
    toast.success("Avatar uploaded");
  } catch (e: any) {
    toast.error(e.message || "Failed to upload avatar");
  } finally {
    setImgUploading(false);
    e.target.value = "";
  }
};


  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErrMsg(null);
    try {
      await updateMyProfile(form);
      await qc.invalidateQueries({ queryKey: qk.profile });
      toast.success("Profile updated");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setMsg(null);
    setErrMsg(null);
    try {
      if (!pwd.newPwd || pwd.newPwd !== pwd.confirmPwd) throw new Error("Passwords do not match");
      await changeMyPassword(pwd.newPwd);
      toast.success("Password updated");
      setPwd({ newPwd: "", confirmPwd: "" });
    } catch (e: any) {
      setErrMsg(e.message || "Failed to update password");
    } finally {
      setPwdSaving(false);
    }
  }

  async function onDeleteAccount() {
    if (!confirm("This will permanently delete your account and data. Continue?")) return;
    setDeleteLoading(true);
    setMsg(null);
    setErrMsg(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error((await res.text()) || "Account deletion failed");
      router.replace("/(auth)/login");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your listings...</p>
          </div>;
  if (error) return <div className="text-red-600">Failed to load profile.</div>;
  if (!profile) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">My Profile</h2>

      <form onSubmit={onSave} className="rounded-lg border bg-white p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
            {form.avatar_url ? (
              <Image src={form.avatar_url} alt="avatar" fill className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">No avatar</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Upload avatar</label>
            <input type="file" accept="image/*" onChange={onAvatarChange} disabled={imgUploading} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input className="mt-1 w-full border rounded p-2 bg-gray-100" value={profile.email ?? ""} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input className="mt-1 w-full border rounded p-2 bg-gray-100" value={profile.username ?? ""} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium">Display name</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.display_name ?? ""}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Website</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.website ?? ""}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Messenger link</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.messenger_link ?? ""}
              onChange={(e) => setForm({ ...form, messenger_link: e.target.value })}
              placeholder="https://m.me/yourname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">WhatsApp number</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.whatsapp_number ?? ""}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              placeholder="+8801XXXXXXXXX"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Contact link (optional)</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.contact_link ?? ""}
              onChange={(e) => setForm({ ...form, contact_link: e.target.value })}
              placeholder="whatsapp://send?phone=..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Location</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, Country"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Bio</label>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows={4}
              value={form.bio ?? ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell others about your fragrance preferences…"
            />
          </div>
        </div>

        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}

        <div className="flex gap-3">
          <button className="px-4 py-2 rounded bg-gray-900 text-white" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={onChangePassword} className="mt-6 rounded-lg border bg-white p-6 space-y-4 max-w-2xl">
        <h3 className="text-lg font-semibold">Change password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">New password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded p-2"
              value={pwd.newPwd}
              onChange={(e) => setPwd({ ...pwd, newPwd: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Confirm password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded p-2"
              value={pwd.confirmPwd}
              onChange={(e) => setPwd({ ...pwd, confirmPwd: e.target.value })}
              required
            />
          </div>
        </div>
        <button className="px-4 py-2 rounded bg-gray-900 text-white" disabled={pwdSaving}>
          {pwdSaving ? "Updating…" : "Update password"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="mt-6 rounded-lg border bg-white p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-red-600">Danger zone</h3>
        <p className="text-sm text-gray-600 mt-1">
          Deleting your account will permanently remove your profile, listings, favorites, and personal data.
        </p>
        <button
          onClick={onDeleteAccount}
          className="mt-3 px-4 py-2 rounded border border-red-600 text-red-700 hover:bg-red-50"
          disabled={deleteLoading}
        >
          {deleteLoading ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </section>
  );
}
