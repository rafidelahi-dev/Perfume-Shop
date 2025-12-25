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
import ConfirmDialog from "@/components/ConfirmDialog";

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

  function openDeleteModal() {
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      // 🔒 Just make sure the user is logged in for UX purposes
      const { data, error } = await supabase.auth.getUser();

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

      await supabase.auth.signOut();
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your profile...</p>
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
          phone: form.contact_number,
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

  

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4 lg:px-0">
      {/* Header */}
      <div className="text-center space-y-2 mt-4 md:mt-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 text-sm lg:text-base">
          Manage your account information and preferences
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
            Profile Information
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your personal details and how others see you
          </p>
        </div>

        <form onSubmit={onSave} className="p-4 lg:p-6 space-y-6 lg:space-y-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 lg:gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative h-20 w-20 lg:h-24 lg:w-24 overflow-hidden rounded-full border-4 border-white shadow-lg">
                {form.avatar_url ? (
                  <Image
                    src={form.avatar_url}
                    alt="Profile avatar"
                    fill
                    sizes="(max-width: 1024px) 80px, 96px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500">
                    <span className="text-xs font-medium">No avatar</span>
                  </div>
                )}
                {imgUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 lg:h-6 w-4 lg:w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
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
          <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
            {/* Read-only fields */}
            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                value={profile.email ?? ""}
                disabled
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Username *people can search you by this name
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
                Display Name *This will reflect on the dashboard
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
                Website *your perfume website or your personal website
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
                Facebook Link
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={form.facebook_link ?? ""}
                onChange={(e) =>
                  setForm({ ...form, facebook_link: e.target.value })
                }
                placeholder="https://www.facebook.com/your.profile"
              />
              <p className="text-xs text-gray-500">
                Your Facebook profile or page (optional).
              </p>
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
              <label 
              className="block text-sm font-medium text-gray-700"> 
              WhatsApp Number 
              </label> 
              <input 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              value={form.whatsapp_number ?? ""} 
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value }) } 
              placeholder="+8801XXXXXXXXX" />
            </div>
            
            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Contact Number
              </label>

              <div className="flex items-center gap-3">
                <input
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                            focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={form.contact_number ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...form, contact_number: e.target.value }))
                  }
                  placeholder="+8801XXXXXXXXX"
                  onBlur={() => {
                    const normalized = normalizeBDPhone(form.contact_number ?? "")
                    if(normalized !== (form.contact_number ?? "")) {
                      setForm((f) => ({...f, contact_number: normalized}))
                    }
                  }}
                />

                {!profile.phone_verified ? (
                  <button
                    type="button"
                    onClick={handleVerifyContactNumber}
                    disabled={!contactOk}
                    className={`px-4 py-2 rounded-lg text-white ${contactOk ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"} 
                              text-sm shadow-sm whitespace-nowrap`}
                  >
                    Verify
                  </button>
                ) : (
                  <span className="px-4 py-2 rounded-lg text-sm bg-green-100 text-green-700">
                    Verified
                  </span>
                )}
              </div>
              {contactNumber && !contactOk && !profile.phone_verified && (
                <p className="text-xs text-red-600 mt-2">
                  Please use a proper Bangladeshi format: <b>+8801*********</b>
                </p>
              )}

              {showContactOtp && !profile.phone_verified && (
                <div className="mt-2 flex flex-col sm:flex-row gap-3">
                  <input
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                              focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={contactOtp}
                    onChange={(e) => setContactOtp(e.target.value)}
                    placeholder="Enter the 6-digit code"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmContactOtp}
                    className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 
                              text-sm shadow-sm whitespace-nowrap"
                  >
                    Confirm
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Your number will be used for buyer communication.
              </p>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Location *Please mention where you are selling from
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

            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Bio *Tell us something about yourself that we can share with others
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
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
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
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={onChangePassword} className="p-4 lg:p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
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

            <div className="space-y-2 lg:col-span-2">
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
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {pwdSaving ? (
                <span className="flex items-center justify-center gap-2">
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
      <div className="mt-8 border-t pt-4 text-center sm:text-left">
        <p className="text-sm font-semibold text-red-700 mb-2">Danger Zone</p>
        {deleteError && (
          <p className="mb-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
        <button
          type="button"
          onClick={openDeleteModal}
          className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Delete my account
        </button>
      </div>

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