"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email?: string; // not in table, but we’ll derive from session
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  contact_link: string | null;      // existing field
  messenger_link: string | null;    // new
  whatsapp_number: string | null;   // new
  website: string | null;           // new
  location: string | null;          // new
  bio: string | null;
};

async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user || null;
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function fetchProfile(): Promise<Profile> {
  const user = await getSessionUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return { ...data, email: user.email } as Profile;
}

async function updateProfile(patch: Partial<Profile>) {
  const user = await getSessionUser();
  const payload = {
    display_name: patch.display_name ?? null,
    avatar_url: patch.avatar_url ?? null,
    contact_link: patch.contact_link ?? null,
    messenger_link: patch.messenger_link ?? null,
    whatsapp_number: patch.whatsapp_number ?? null,
    website: patch.website ?? null,
    location: patch.location ?? null,
    bio: patch.bio ?? null,
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) throw error;
}

async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

async function uploadAvatar(file: File): Promise<string> {
  const user = await getSessionUser();
  const ext = file.name.split(".").pop();
  const path = `avatars/${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (upErr) throw upErr;

  // Public URL (bucket is public for MVP)
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
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
      const url = await uploadAvatar(file);
      setForm((f) => ({ ...f, avatar_url: url }));
      setMsg("Avatar uploaded. Click Save to apply.");
    } catch (e: any) {
      setErrMsg(e.message || "Upload failed");
    } finally {
      setImgUploading(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null); setErrMsg(null);
    try {
      await updateProfile(form);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setMsg("Profile updated");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setMsg(null); setErrMsg(null);
    try {
      if (!pwd.newPwd || pwd.newPwd !== pwd.confirmPwd) {
        throw new Error("Passwords do not match");
      }
      await updatePassword(pwd.newPwd);
      setMsg("Password updated");
      setPwd({ newPwd: "", confirmPwd: "" });
    } catch (e: any) {
      setErrMsg(e.message || "Failed to update password");
    } finally {
      setPwdSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account and data. Continue?")) return;
    setDeleteLoading(true);
    setMsg(null); setErrMsg(null);
    try {
      // Get current session access token to prove identity to the server
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No active session");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Account deletion failed");
      }
      // Sign out locally and redirect to login
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) return <div>Loading profile…</div>;
  if (error) return <div className="text-red-600">Failed to load profile.</div>;
  if (!profile) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">My Profile</h2>

      {/* Profile card */}
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

      {/* Danger zone: delete account */}
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
