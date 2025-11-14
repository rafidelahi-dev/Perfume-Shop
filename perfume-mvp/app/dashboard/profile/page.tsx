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

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
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

  async function onDeleteAccount() {
    const confirmed = window.confirm(
      "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure you want to continue?"
    );
    if (!confirmed) return;

    setDeleteLoading(true);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Account deletion failed");
      }

      toast.success("Account deleted successfully");
      router.replace("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your profile...</p>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your account information and preferences
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
          <h2 className="text-xl font-semibold text-gray-900">
            Profile Information
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your personal details and how others see you
          </p>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg">
                {form.avatar_url ? (
                  <Image
                    src={form.avatar_url}
                    alt="Profile avatar"
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500">
                    <span className="text-sm font-medium">No avatar</span>
                  </div>
                )}
                {imgUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="font-medium text-gray-900">Profile Picture</h3>
              <p className="text-sm text-gray-600">JPG, PNG or WebP. Max 5MB.</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Change avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarChange}
                  disabled={imgUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Read-only fields */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                value={profile.email ?? ""}
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                value={profile.username ?? ""}
                disabled
              />
            </div>

            {/* Editable fields */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.display_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.website ?? ""}
                onChange={(e) =>
                  setForm({ ...form, website: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Messenger Link
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.messenger_link ?? ""}
                onChange={(e) =>
                  setForm({ ...form, messenger_link: e.target.value })
                }
                placeholder="https://m.me/yourname"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                WhatsApp Number
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.whatsapp_number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, whatsapp_number: e.target.value })
                }
                placeholder="+8801XXXXXXXXX"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Contact Link
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.contact_link ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contact_link: e.target.value })
                }
                placeholder="whatsapp://send?phone=..."
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.location ?? ""}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="City, Country"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                rows={4}
                value={form.bio ?? ""}
                onChange={(e) =>
                  setForm({ ...form, bio: e.target.value })
                }
                placeholder="Tell others about your fragrance preferences, collecting habits, or what you love about perfumes..."
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Brief introduction about yourself</span>
                <span>{form.bio?.length || 0}/500</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Changes...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={onChangePassword} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={pwd.newPwd}
                onChange={(e) =>
                  setPwd({ ...pwd, newPwd: e.target.value })
                }
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={pwd.confirmPwd}
                onChange={(e) =>
                  setPwd({ ...pwd, confirmPwd: e.target.value })
                }
                required
                placeholder="Confirm your new password"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={pwdSaving || !pwd.newPwd || !pwd.confirmPwd}
              className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {pwdSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating Password...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden mb-16">
        <div className="px-6 py-4 border-b border-red-200 bg-gradient-to-r from-red-50 to-red-100/30">
          <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
          <p className="text-sm text-red-700 mt-1">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-medium text-red-900">Delete Account</h3>
              <p className="text-sm text-red-700 max-w-2xl">
                Permanently delete your account, profile, listings, favorites,
                and all personal data. This action cannot be undone and you will
                lose access to all your information.
              </p>
            </div>

            <button
              onClick={onDeleteAccount}
              disabled={deleteLoading}
              className="px-6 py-2.5 border border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete Account Permanantly"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
