import React from 'react'
import { useState, useRef, useMemo } from 'react';   
import { uploadToBucket } from "@/lib/queries/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertListing } from "@/lib/queries/listings";
import { toast } from 'sonner';
import { qk } from '@/lib/queries/key'; 
import Image from 'next/image';


const ListingForm = () => {
    const [subBrand, setSubBrand] = useState("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
      const qc = useQueryClient();

    type DecantRow = { size_ml: number | ""; price: number | "" }; 

    // form state
    const [brand, setBrand] = useState("");
    
    const [perfumeName, setPerfumeName] = useState("");
    const [type, setType] = useState<"intact" | "partial" | "decant">("intact");

    const [bottleSize, setBottleSize] = useState<number | "">("");
    const [partialLeft, setPartialLeft] = useState<number | "">("");
    const [singlePrice, setSinglePrice] = useState<number | "">("");
    
    const [decants, setDecants] = useState<DecantRow[]>([{ size_ml: "", price: "" }]);
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);



  function addDecantRow() {
    setDecants((rows) => [...rows, { size_ml: "", price: "" }]);
  }
  function removeDecantRow(idx: number) {
    setDecants((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateDecant(idx: number, key: "size_ml" | "price", val: number | "") {
    setDecants((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  }

  const heading = useMemo(() => {
  if (type === "intact") return "Intact bottle details";
  if (type === "partial") return "Partial bottle details";
  return "Decants (one or more sizes)";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

    async function onUploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setFormError(null);
    try {
      const urls = await uploadToBucket("listing-images", files)
      setImages((prev) => [...prev, ...urls])
      toast.success("Images uploaded!");
    } catch (err: any) {
      setFormError(err.message || "Upload failed");
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      toast.success("Listing added successfully!");
    },
  });

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
        payload = { ...base, partial_left_ml: Number(partialLeft), price: Number(singlePrice), bottle_size_ml: null, decant_options: [] };
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

  return (
    <>
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
                    <div className="relative h-full w-full overflow-hidden rounded-xl">
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
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
    </>
  )
}

export default ListingForm