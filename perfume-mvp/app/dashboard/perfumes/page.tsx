"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import {
  fetchMyPerfumes,
  insertMyPerfumes,
  deleteMyPerfume,
  updateMyPerfume,
} from "@/lib/queries/userPerfumes";
import { uploadToBucket } from "@/lib/queries/storage";
import PerfumeForm from "./perfumeComponents/PerfumeForm";
import PerfumeList, {
  type Perfume as PerfumeRow,
} from "./perfumeComponents/PerfumeList";
import EditPerfume from "./perfumeComponents/EditPerfume";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

type FormState = {
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];
};

// This is what we EXPECT from user_perfumes table for this page.
// It matches the Perfume type used by PerfumeList.
type UserPerfume = PerfumeRow;

export default function MyPerfumesPage() {
  const qc = useQueryClient();

  // ---------- Form & UI States ----------
  const [form, setForm] = useState<FormState>({
    brand: "",
    sub_brand: "",
    name: "",
    images: [],
  });
  const [upLoading, setUpLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState & { id: string } | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

  // ---------- React Query ----------
  const {
    data,
    isLoading,
    error,
  } = useQuery<UserPerfume[], Error>({
    queryKey: qk.userPerfumes(userId),
    queryFn: fetchMyPerfumes,
  });

  // (Currently not used in UI, but typed properly now)

  // ---------- Mutations ----------
  const create = useMutation<void, Error, FormState>({
    mutationFn: (input) =>
      insertMyPerfumes({
        brand: input.brand,
        sub_brand: input.sub_brand ?? undefined,
        name: input.name,
        images: input.images,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userPerfumes(userId) });
      setForm({ brand: "", sub_brand: "", name: "", images: [] });
      toast.success("Perfume added successfully!");
    },
    onError: (error) =>
      toast.error(error.message || "Error adding perfume"),
  });

  const destroy = useMutation<void, Error, string>({
    mutationFn: (id) => deleteMyPerfume({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userPerfumes(userId) });
      toast.success("Perfume deleted.");
    },
    onError: (error) => toast.error(error.message || "Delete failed"),
  });

  const update = useMutation<
    void,
    Error,
    { id: string; brand: string; sub_brand?: string | null; name: string; images: string[] }
  >({
    mutationFn: updateMyPerfume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userPerfumes(userId) });
      setEditing(null);
      toast.success("Perfume updated successfully!");
    },
    onError: (error) => toast.error(error.message || "Update failed"),
  });

  // ---------- Upload ----------
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUpLoading(true);
    setCreateErr(null);
    try {
      const urls = await uploadToBucket("user-perfumes", files);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success("Images uploaded!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : null;
      toast.error(error?.message || "Image upload failed");
    } finally {
      setUpLoading(false);
      e.currentTarget.value = "";
    }
  }

  // ---------- Form Validation ----------
  function validate() {
    if (!form.images || form.images.length === 0)
      return "Please upload at least one image.";
    if (!form.brand.trim()) return "Brand is required.";
    if (!form.name.trim()) return "Perfume name is required.";
    return null;
  }

  // ---------- Create Perfume ----------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setCreateErr(null);
    const v = validate();
    if (v) return setCreateErr(v);
    setSaving(true);
    setShowForm(false);
    create.mutate(
      {
        brand: form.brand,
        sub_brand: form.sub_brand ?? null,
        name: form.name,
        images: form.images,
      },
      { onSettled: () => setSaving(false) }
    );
  }

  // ---------- Component ----------
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">My Perfumes</h2>

      {/* Toggle button for showing form */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] hover:opacity-90"
        >
          {showForm ? "Cancel" : "Add New Perfume"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <PerfumeForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onUpload={onUpload}
          createMsg={createMsg}
          createErr={createErr}
          saving={saving}
          upLoading={upLoading}
        />
      )}

      {/* Perfume list */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Your collection</h3>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
            <p className="text-gray-600 font-medium">
              Loading your listings...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Unable to load listings
            </h3>
            <p className="text-red-700 mb-4">
              There was an error loading your perfume listings.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        <PerfumeList
          items={data ?? []}
          isLoading={isLoading}
          error={error}
          onEdit={(item) => setEditing(item)}
          onDelete={(id) => destroy.mutate(id)}
        />

        {/* Edit Modal */}
        {editing && (
          <EditPerfume
            editing={editing}
            setEditing={setEditing}
            update={update}
            editMsg={editMsg}
            setEditMsg={setEditMsg}
            editErr={editErr}
            setEditErr={setEditErr}
          />
        )}
      </div>
    </section>
  );
}
