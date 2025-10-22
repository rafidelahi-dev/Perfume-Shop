"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Sparkles, Trash2 } from "lucide-react";

type PerfumeForm = {
  brand: string;
  sub_brand?: string;
  name: string;
  images: string[]; // multiple images
};

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  console.log("Authenticated user id:", data.user?.id);
  const user = data.user;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function fetchMyPerfumes() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("user_perfumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function insertPerfume(values: PerfumeForm) {
  const userId = await getUserId();
  // If you set `user_id default auth.uid()`, you can omit user_id here.
  const { error } = await supabase
    .from("user_perfumes")
    .insert({ user_id: userId, ...values });
  if (error) throw error;
}

async function deletePerfume(id: string) {
  const userId = await getUserId();
  const { error } = await supabase
    .from("user_perfumes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export default function MyPerfumesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PerfumeForm>({
    brand: "",
    sub_brand: "",
    name: "",
    images: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["user_perfumes"],
    queryFn: fetchMyPerfumes,
  });

  const create = useMutation({
    mutationFn: insertPerfume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_perfumes"] });
      setForm({ brand: "", sub_brand: "", name: "", images: [] });
      setMsg("Perfume added");
    },
    onError: (e: any) => setErr(e.message || "Failed to save"),
  });

  const destroy = useMutation({
    mutationFn: deletePerfume,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_perfumes"] }),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setErr(null);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id!;
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("user-perfumes")
          .upload(path, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage
          .from("user-perfumes")
          .getPublicUrl(path);
        urls.push(publicUrl.publicUrl);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      setMsg("Images uploaded. Click “Add Perfume” to save.");
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  function validate() {
    if (!form.images.length) return "Please upload at least one image.";
    if (!form.brand.trim()) return "Brand is required.";
    if (!form.name.trim()) return "Perfume name is required.";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const v = validate();
    if (v) return setErr(v);
    setSaving(true);
    create.mutate(form, {
      onSettled: () => setSaving(false),
    });
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">My Perfumes</h2>

      {/* Add form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-2xl border border-black/5 bg-white p-5 md:p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Brand *</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                placeholder="Dior"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Sub-brand (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                placeholder="Sauvage line"
                value={form.sub_brand || ""}
                onChange={(e) => setForm({ ...form, sub_brand: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Perfume name *</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                placeholder="Sauvage"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Right */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1a1a1a]">Photos * (you can select multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              disabled={uploading}
              className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
            />
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="aspect-square w-full object-cover rounded-xl border" />
                ))}
              </div>
            )}
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        {msg && <p className="mt-4 text-sm text-green-700">{msg}</p>}

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving || create.isPending || uploading}
            className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] hover:opacity-90 disabled:opacity-60"
          >
            {saving || create.isPending ? "Saving…" : "Add Perfume"}
          </button>
        </div>
      </form>

      {/* Grid of your perfumes */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Your collection</h3>

        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Error loading perfumes.</p>}

        {data && data.length === 0 && (
          <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
            No perfumes yet — add your first one above.
          </div>
        )}

        {data && data.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((p: any) => (
              <li key={p.id} className="group rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-50 to-rose-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.images?.[0] || ""}
                    alt={`${p.brand} ${p.name}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-[#c08a00]">
                    {p.brand}{p.sub_brand ? ` • ${p.sub_brand}` : ""}
                  </div>
                  <h4 className="mt-1 font-semibold text-[#111] line-clamp-1">{p.name}</h4>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <Sparkles className="h-3 w-3" />
                      Added {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => destroy.mutate(p.id)}
                      className="rounded-full border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
