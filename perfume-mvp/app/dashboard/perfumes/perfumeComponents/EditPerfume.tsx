"use client";

import Image from "next/image";
import { X, Plus } from "lucide-react";
import { uploadToBucket } from "@/lib/queries/storage";
import { toast } from "sonner";
import {
  useRef,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  type FormEvent,
} from "react";

type EditForm = {
  id: string;
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];
};

// ✅ Minimal shape of the mutation object we need
type UpdateMutation = {
  mutate: (input: {
    id: string;
    brand: string;
    sub_brand: string | null;
    name: string;
    images: string[];
  }) => void;
  isPending: boolean;
};

type Props = {
  editing: EditForm | null;
  setEditing: Dispatch<SetStateAction<EditForm | null>>;
  update: UpdateMutation; // 👈 no more any
  editMsg: string | null;
  setEditMsg: (v: string | null) => void;
  editErr: string | null;
  setEditErr: (v: string | null) => void;
};

export default function EditPerfume({
  editing,
  setEditing,
  update,
  editMsg,
  setEditMsg,
  editErr,
  setEditErr,
}: Props) {
  const editFileRef = useRef<HTMLInputElement>(null);

  if (!editing) return null;

  // Handle image upload
  async function onEditUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const urls = await uploadToBucket("user-perfumes", files);
      setEditing((prev) =>
        prev ? { ...prev, images: [...(prev.images || []), ...urls] } : prev
      );
      toast.success("Images uploaded!");
    } catch (err: unknown) {
      // 👇 safer than `any`
      if (err instanceof Error) {
        toast.error(err.message || "Upload failed");
      } else {
        toast.error("Upload failed");
      }
    } finally {
      if (editFileRef.current) editFileRef.current.value = "";
    }
  }

  function removeEditingImage(idx: number) {
    setEditing((prev) =>
      prev
        ? { ...prev, images: prev.images.filter((_, i) => i !== idx) }
        : prev
    );
    toast.success("Image removed (Remember to save changes!)");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditMsg(null);
    setEditErr(null);

    if (!editing) return;

    update.mutate({
      id: editing.id,
      brand: editing.brand,
      sub_brand: editing.sub_brand ?? null,
      name: editing.name,
      images: editing.images ?? [],
    });
  }

  return (
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

        {/* Existing images */}
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
                  <div className="relative aspect-square w-full">
                    <Image
                      src={url}
                      alt={`Listing image ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEditingImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                    title="Remove this image"
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

        {/* Add new images */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Add more images
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onEditUpload}
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
        </div>

        {/* Messages */}
        {editErr && <p className="text-sm text-red-600 mb-2">{editErr}</p>}
        {editMsg && <p className="text-sm text-green-700 mb-2">{editMsg}</p>}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Brand *</label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              value={editing.brand}
              onChange={(e) =>
                setEditing({ ...editing, brand: e.target.value })
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
                setEditing({ ...editing, sub_brand: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Name *</label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
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
  );
}
