"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import {
  fetchMyPerfumes,
  insertMyPerfumes,
  deleteMyPerfume,
  updateMyPerfume,
} from "@/lib/queries/userPerfumes";
import { uploadToBucket } from "@/lib/queries/storage";
import { Sparkles, Trash2, X, Plus } from "lucide-react";
import PerfumeForm from "./perfumeComponents/PerfumeForm";
import { useFlash } from "@/lib/hooks/useFlash";
import PerfumeList from "./perfumeComponents/PerfumeList";

type FormState = {
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];
};

export default function MyPerfumesPage() {
  const qc = useQueryClient();
  const flash = useFlash();

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
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<FormState & { id: string } | null>(
    null
  );
  const [editUploading, setEditUploading] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);

  // ---------- React Query ----------
  const { data, isLoading, error } = useQuery({
    queryKey: qk.userPerfumes,
    queryFn: fetchMyPerfumes,
  });

  const filtered = (data ?? []).filter((p: any) => {
    const q = searchTerm.toLowerCase();
    return (
      p.brand?.toLowerCase().includes(q) ||
      p.sub_brand?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    );
  });

  // ---------- Mutations ----------
  const create = useMutation({
    mutationFn: insertMyPerfumes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userPerfumes });
      setForm({ brand: "", sub_brand: "", name: "", images: [] });
      flash(setCreateMsg, "Perfume added successfully!");
    },
    onError: (error: any) => setCreateErr(error.message || "Error adding perfume"),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => deleteMyPerfume({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.userPerfumes }),
  });

  const update = useMutation({
    mutationFn: updateMyPerfume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userPerfumes });
      setEditing(null);
      flash(setEditMsg, "Perfume updated successfully!");
    },
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
      setCreateMsg("Images uploaded successfully!");
    } catch (e: any) {
      setCreateErr(e.message || "Error uploading images");
    } finally {
      setUpLoading(false);
      e.currentTarget.value = "";
    }
  }

  async function onEditUpload(e: React.ChangeEvent<HTMLInputElement>){
    const files = Array.from(e.target.files || []);
    if(!files.length || !editing) return;
    setEditUploading(true);
    setEditErr(null);
    try{
      const urls = await uploadToBucket("user-perfumes", files)
      setEditing((prev) => 
      prev ? {...prev, images: [...(prev.images || []), ...urls]} : prev
    )
    setEditMsg("Images Updated")
    }catch(e: any){
      setEditErr(e.message || "error uploading Images")
    } finally {
      setEditUploading(false);
      if (editFileRef.current) editFileRef.current.value = "";
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
        sub_brand: form.sub_brand ?? undefined,
        name: form.name,
        images: form.images,
      },
      { onSettled: () => setSaving(false) }
    );
  }

  //----------Edit Helper--------------
  function removeEditingImage(idx: number) {
  setEditing((prev) =>
    prev
      ? { ...prev, images: prev.images.filter((_, i) => i !== idx) }
      : prev
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

        {isLoading && <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your listings...</p>
          </div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to load listings</h3>
            <p className="text-red-700 mb-4">There was an error loading your perfume listings.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>}

        <PerfumeList
          items={(data ?? []) as any}          // or type to Perfume if your query is typed
          isLoading={isLoading}
          error={error}
          onEdit={(item) => setEditing(item)}  // you can open your edit modal later
          onDelete={(id) => destroy.mutate(id)}
        />

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Edit Perfume</h3>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-full p-1 hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Existing images with remove controls */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Current images
                </label>
                {editing.images?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {editing.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg overflow-hidden border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditingImage(idx)}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                          title="Remove this image from the perfume"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No images yet.</p>
                )}
              </div>

              {/* Add more images */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Add more images
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onEditUpload}
                    disabled={editUploading}
                    className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-500"
                    title="Select files to add"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {editUploading && (
                  <p className="mt-1 text-sm text-gray-500">
                    Uploading images…
                  </p>
                )}
              </div>

              {/* Editable fields */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateMsg(null);
                  setCreateErr(null);
                  update.mutate({
                    id: editing.id,
                    brand: editing.brand,
                    sub_brand: editing.sub_brand ?? null,
                    name: editing.name,
                    images: editing.images ?? [],
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium">Brand *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                    value={editing.brand || ""}
                    onChange={(e) =>
                      setEditing((v) =>
                        v ? { ...v, brand: e.target.value } : v
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Sub-brand</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                    value={editing.sub_brand || ""}
                    onChange={(e) =>
                      setEditing((v) =>
                        v ? { ...v, sub_brand: e.target.value } : v
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Name *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                    value={editing.name || ""}
                    onChange={(e) =>
                      setEditing((v) =>
                        v ? { ...v, name: e.target.value } : v
                      )
                    }
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={update.isPending}
                    className="rounded-lg bg-[#1a1a1a] px-5 py-2 text-[#f8f7f3] disabled:opacity-60"
                  >
                    {update.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
