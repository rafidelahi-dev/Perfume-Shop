"use client";
import Image from "next/image";
import { useRef } from "react";

export default function PerfumeForm({
  form,
  setForm,
  onSubmit,
  onUpload,
  createMsg,
  createErr,
  saving,
  upLoading,
}: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-2xl border border-black/5 bg-white p-5 md:p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">Brand *</label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">Sub-brand</label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              value={form.sub_brand || ""}
              onChange={(e) => setForm({ ...form, sub_brand: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">Perfume name *</label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Photos * (you can select multiple)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onUpload}
            disabled={upLoading}
            className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
          />
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.images.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border">
                  <Image
                    src={url}
                    alt={`Uploaded image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {createErr && <p className="mt-4 text-sm text-red-600">{createErr}</p>}
      {createMsg && <p className="mt-4 text-sm text-green-700">{createMsg}</p>}

      <div className="mt-4">
        <button
          type="submit"
          disabled={saving || upLoading}
          className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add Perfume"}
        </button>
      </div>
    </form>
  );
}
