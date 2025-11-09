"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { deleteMyListing } from "@/lib/queries/listings";
import { qk } from "@/lib/queries/key";
import { useRouter } from "next/navigation";

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
  // Fallback extension if the file has no extension in its name
  const original = file.name || "image";
  const parts = original.split(".");
  const ext = parts.length > 1 ? parts.pop() : "jpg"; // default to jpg
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (upErr) {
    // This is the place that threw "row-level security policy" before
    throw upErr;
  }

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
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.userListings,
    queryFn: fetchMyListings,
  });

    // create the mutation *inside* the component
  const destroy = useMutation({
    mutationFn: (id: string) => deleteMyListing(id), // or your local delete function
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userListings }); // or ["my_listings"]
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: insertListing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userListings });
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

  function confirmAndDelete(id: string) {
    const ok = window.confirm("Delete this listing permanently?");
    if (!ok) return;
    destroy.mutate(id); // your delete mutation
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
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        payload = { ...base, bottle_size_ml: Number(bottleSize), price: Number(singlePrice), partial_left_ml: null, decant_options: [] };
      } else if (type === "partial") {
        payload = { ...base, partial_left_ml: Number(partialLeft), price: Number(singlePrice), bottle_size_ml: null, decants_options: [] };
      } else { // type === "decant"
        const cleaned = decants
          .map(d => ({
            ml: d.size_ml === "" ? null : Number(d.size_ml),
            price: d.price === "" ? null : Number(d.price),
          }))
          .filter(d => typeof d.ml === "number" && d.ml > 0 && typeof d.price === "number" && d.price > 0);

        if (cleaned.length === 0) {
          throw new Error("Add at least one decant size with a positive price.");
        }

        payload = {
          ...base,
          type: "decant",
          decant_options: cleaned,   // <— IMPORTANT: use 'decant_options'
          price: null,               
          bottle_size_ml: null,
          partial_left_ml: null,
        };
      }

      // right before: await create.mutateAsync(payload);
      console.log("INSERT listings payload:", JSON.stringify(payload, null, 2));


      await create.mutateAsync(payload);

      if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">My Listings</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a1a1a] text-[#f8f7f3] px-6 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium"
        >
          {showForm ? "Cancel" : "+ Add New Listing"}
        </button>
      </div>

      {showForm && (
        <form
        onSubmit={(e) => {
            onSubmit(e); }}
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
              ref={fileInputRef}
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
      )}

      {/* Form */}
      

      {/* Listings grid */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Your listings</h3>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your listings...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
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
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
            You have no listings yet. Add one using the form above.
          </div>
        )}

        {data && data.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((l: any) => {
              // 👇 compute a single “from” price for decants (fallback to l.price if needed)
              const fromPrice =
                typeof l.min_price === "number"
                ? Number(l.min_price)
                : (l.price != null ? Number(l.price) : null);

              return (
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
                      <button
                        onClick={() => router.push(`/dashboard/listings/${l.id}`)}
                        className="rounded-full border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmAndDelete(l.id)}
                        className="rounded-full border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>

                    {l.type !== "decant" ? (
                      <div className="mt-2 text-sm text-gray-700">
                        {l.type === "intact" && l.bottle_size_ml && (
                          <div>Bottle: {l.bottle_size_ml} ml</div>
                        )}
                        {l.type === "partial" && l.partial_left_ml && (
                          <div>Left: {l.partial_left_ml} ml</div>
                        )}
                        {typeof fromPrice === "number" && !Number.isNaN(fromPrice) && (
                          <div className="font-medium mt-1">${fromPrice.toFixed(2)}</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-700">
                        {/* 👇 NEW: show a single “From $X.XX” line for decants */}
                        {typeof fromPrice === "number" && !Number.isNaN(fromPrice) && (
                          <div className="mt-1">
                            From <span className="font-medium">${fromPrice.toFixed(2)}</span>
                          </div>
                        )}

                        {Array.isArray(l.decant_options) && l.decant_options.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {l.decant_options.map((d: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span>{Number(d.ml)} ml</span>
                              <span className="font-medium">${Number(d.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2">No decant sizes listed</div>
                      )}
                      </div> 
                      )} 
                  </div> 
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </section>
  );
}
