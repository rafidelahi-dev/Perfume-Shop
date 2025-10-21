"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

type DecantRow = { size_ml: number | ""; price: number | "" };

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function fetchMyListings() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function uploadImage(file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}

async function insertListing(values: any) {
  const userId = await getUserId();
  const payload = { user_id: userId, ...values };
  const { error } = await supabase.from("listings").insert(payload);
  if (error) throw error;
}

export default function MyListingsPage() {
  const qc = useQueryClient();

  // form state
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [perfumeName, setPerfumeName] = useState("");
  const [type, setType] = useState<"intact" | "partial" | "decant">("intact");

  const [bottleSize, setBottleSize] = useState<number | "">("");
  const [partialLeft, setPartialLeft] = useState<number | "">("");
  const [singlePrice, setSinglePrice] = useState<number | "">("");

  const [decants, setDecants] = useState<DecantRow[]>([{ size_ml: "", price: "" }]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my_listings"],
    queryFn: fetchMyListings,
  });

  const create = useMutation({
    mutationFn: insertListing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_listings"] });
      // reset form
      setBrand("");
      setSubBrand("");
      setPerfumeName("");
      setType("intact");
      setBottleSize("");
      setPartialLeft("");
      setSinglePrice("");
      setDecants([{ size_ml: "", price: "" }]);
      setImages([]);
    },
  });

  function addDecantRow() {
    setDecants((rows) => [...rows, { size_ml: "", price: "" }]);
  }
  function removeDecantRow(idx: number) {
    setDecants((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateDecant(idx: number, key: "size_ml" | "price", val: number | "") {
    setDecants((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  }

  async function onUploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setFormError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id!;
      const urls: string[] = [];
      for (const f of files) {
        const url = await uploadImage(f, userId);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setFormError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.currentTarget.value = ""; // reset file input
    }
  }

  function validate() {
    if (!brand.trim()) return "Brand is required.";
    if (!perfumeName.trim()) return "Perfume name is required.";
    if (images.length === 0) return "At least one image is required.";
    if (type === "intact") {
      if (!bottleSize || bottleSize <= 0) return "Bottle size (ml) is required for Intact.";
      if (!singlePrice || singlePrice <= 0) return "Price is required.";
    }
    if (type === "partial") {
      if (!partialLeft || partialLeft <= 0) return "Amount left (ml) is required for Partial.";
      if (!singlePrice || singlePrice <= 0) return "Price is required.";
    }
    if (type === "decant") {
      const valid = decants.filter((d) => d.size_ml && d.price && d.size_ml > 0 && d.price > 0);
      if (valid.length === 0) return "Add at least one decant size with price.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const errMsg = validate();
      if (errMsg) throw new Error(errMsg);

      const base = {
        brand,
        sub_brand: subBrand || null,
        perfume_name: perfumeName,
        type,
        images,
      };

      let payload: any = base;

      if (type === "intact") {
        payload = { ...base, bottle_size_ml: Number(bottleSize), price: Number(singlePrice), partial_left_ml: null, decants: [] };
      } else if (type === "partial") {
        payload = { ...base, partial_left_ml: Number(partialLeft), price: Number(singlePrice), bottle_size_ml: null, decants: [] };
      } else {
        const cleaned = decants
          .filter((d) => d.size_ml && d.price)
          .map((d) => ({ size_ml: Number(d.size_ml), price: Number(d.price) }));
        payload = { ...base, decants: cleaned, price: null, bottle_size_ml: null, partial_left_ml: null };
      }

      await create.mutateAsync(payload);
    } catch (err: any) {
      setFormError(err.message || "Failed to create listing");
    } finally {
      setSaving(false);
    }
  }

  const heading = useMemo(() => {
    if (type === "intact") return "Intact bottle details";
    if (type === "partial") return "Partial bottle details";
    return "Decants (one or more sizes)";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">My Listings</h2>

      {/* Form */}
      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-2xl border border-black/5 bg-white p-5 md:p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Basic info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Brand *</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                placeholder="Dior"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Sub-brand (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                placeholder="Sauvage line"
                value={subBrand}
                onChange={(e) => setSubBrand(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Perfume name *</label>
              <input
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                placeholder="Sauvage"
                value={perfumeName}
                onChange={(e) => setPerfumeName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a]">Type *</label>
              <select
                className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="intact">Intact</option>
                <option value="partial">Partial</option>
                <option value="decant">Decant</option>
              </select>
            </div>
          </div>

          {/* Right: Images */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1a1a1a]">Photos *</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onUploadImages}
              disabled={uploading}
              className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
            />
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((src) => (
                  <div key={src} className="aspect-square overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Type-specific block */}
        <div className="mt-6 rounded-xl border border-black/5 bg-[#f8f7f3] p-4">
          <p className="mb-3 text-sm font-medium text-[#1a1a1a]">{heading}</p>

          {type === "intact" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="number"
                min={1}
                className="rounded-lg border border-black/10 bg-white px-3 py-2"
                placeholder="Bottle size (ml)"
                value={bottleSize}
                onChange={(e) => setBottleSize(e.target.value ? Number(e.target.value) : "")}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="rounded-lg border border-black/10 bg-white px-3 py-2"
                placeholder="Price"
                value={singlePrice}
                onChange={(e) => setSinglePrice(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          )}

          {type === "partial" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="number"
                min={1}
                className="rounded-lg border border-black/10 bg-white px-3 py-2"
                placeholder="Amount left (ml)"
                value={partialLeft}
                onChange={(e) => setPartialLeft(e.target.value ? Number(e.target.value) : "")}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="rounded-lg border border-black/10 bg-white px-3 py-2"
                placeholder="Price"
                value={singlePrice}
                onChange={(e) => setSinglePrice(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
          )}

          {type === "decant" && (
            <div className="space-y-2">
              {decants.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    type="number"
                    min={1}
                    className="col-span-5 rounded-lg border border-black/10 bg-white px-3 py-2"
                    placeholder="Size (ml)"
                    value={row.size_ml}
                    onChange={(e) =>
                      updateDecant(i, "size_ml", e.target.value ? Number(e.target.value) : "")
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="col-span-5 rounded-lg border border-black/10 bg-white px-3 py-2"
                    placeholder="Price"
                    value={row.price}
                    onChange={(e) =>
                      updateDecant(i, "price", e.target.value ? Number(e.target.value) : "")
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeDecantRow(i)}
                    className="col-span-2 rounded-lg border border-black/10 px-3 py-2 hover:bg-black/5"
                    disabled={decants.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDecantRow}
                className="mt-2 rounded-lg border border-black/10 px-3 py-2 hover:bg-black/5"
              >
                + Add another size
              </button>
            </div>
          )}
        </div>

        {/* Errors / actions */}
        {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving || create.isPending || uploading}
            className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] hover:opacity-90 disabled:opacity-60"
          >
            {saving || create.isPending ? "Saving…" : "Add Listing"}
          </button>
        </div>
      </form>

      {/* Listings grid */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Your listings</h3>
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Error loading listings.</p>}

        {data && data.length === 0 && (
          <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
            You have no listings yet. Add one using the form above.
          </div>
        )}

        {data && data.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((l: any) => (
              <li
                key={l.id}
                className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm"
              >
                {l.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {l.brand}{l.sub_brand ? ` • ${l.sub_brand}` : ""}
                  </div>
                  <h4 className="mt-1 font-semibold">{l.perfume_name}</h4>

                  <div className="mt-2">
                    <span className="inline-block rounded-full bg-[#f8f7f3] px-2 py-1 text-xs capitalize">
                      {l.type}
                    </span>
                  </div>

                  {l.type !== "decant" ? (
                    <div className="mt-2 text-sm text-gray-700">
                      {l.type === "intact" && l.bottle_size_ml && (
                        <div>Bottle: {l.bottle_size_ml} ml</div>
                      )}
                      {l.type === "partial" && l.partial_left_ml && (
                        <div>Left: {l.partial_left_ml} ml</div>
                      )}
                      {typeof l.price === "number" && (
                        <div className="font-medium mt-1">${Number(l.price).toFixed(2)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-700">
                      {Array.isArray(l.decants) && l.decants.length > 0 ? (
                        <div className="space-y-1">
                          {l.decants.map((d: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span>{d.size_ml} ml</span>
                              <span className="font-medium">${Number(d.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>No decant sizes listed</div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
