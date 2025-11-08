"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus } from "lucide-react";

async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
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

async function updateListing(id: string, patch: any) {
  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error) throw error;
}

export default function EditListingPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
  });

  // form state
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [perfumeName, setPerfumeName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState<number | "">("");
  const [bottleSize, setBottleSize] = useState<number | "">("");
  const [partialLeft, setPartialLeft] = useState<number | "">("");
  const [decants, setDecants] = useState<{ ml: number; price: number }[]>([]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listing) return;
    setBrand(listing.brand || "");
    setSubBrand(listing.sub_brand || "");
    setPerfumeName(listing.perfume_name || "");
    setImages(Array.isArray(listing.images) ? listing.images : []);

    if (listing.type === "intact") {
      setBottleSize(listing.bottle_size_ml || "");
      setPrice(listing.price || "");
    } else if (listing.type === "partial") {
      setPartialLeft(listing.partial_left_ml || "");
      setPrice(listing.price || "");
    } else if (listing.type === "decant") {
      setDecants(listing.decant_options || []);
    }
  }, [listing]);

  const save = useMutation({
    mutationFn: (patch: any) => updateListing(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_listings"] });
      router.push("/dashboard/listings");
    },
  });

  // Upload new images
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id!;
      const urls: string[] = [];
      for (const f of files) {
        const url = await uploadImage(f, userId);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  function validate() {
    if (!brand.trim()) return "Brand is required";
    if (!perfumeName.trim()) return "Perfume name is required";
    if (!images.length) return "At least one image is required";

    if (listing.type === "intact") {
      if (!bottleSize) return "Bottle size is required";
      if (!price) return "Price is required";
    }

    if (listing.type === "partial") {
      if (!partialLeft) return "Amount left is required";
      if (!price) return "Price is required";
    }

    if (listing.type === "decant") {
      const valid = decants.filter((d) => d.ml > 0 && d.price > 0);
      if (!valid.length) return "At least one decant size with price is required";
    }
    return null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const err = validate();
    if (err) return setFormError(err);

    const patch: any = {
      brand,
      sub_brand: subBrand || null,
      perfume_name: perfumeName,
      images,
    };

    if (listing.type === "intact") {
      patch.bottle_size_ml = Number(bottleSize);
      patch.price = Number(price);
      patch.partial_left_ml = null;
      patch.decant_options = [];
    } else if (listing.type === "partial") {
      patch.partial_left_ml = Number(partialLeft);
      patch.price = Number(price);
      patch.bottle_size_ml = null;
      patch.decant_options = [];
    } else if (listing.type === "decant") {
      patch.price = null;
      patch.bottle_size_ml = null;
      patch.partial_left_ml = null;
      patch.decant_options = decants;
    }

    setSaving(true);
    save.mutate(patch, {
      onSettled: () => setSaving(false),
      onError: (e: any) => setFormError(e.message),
    });
  }

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error loading listing</p>;
  if (!listing) return <p>Not found</p>;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Edit Listing</h2>

      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 space-y-6">
        
        {/* Main fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Brand *</label>
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />

            <label className="block text-sm font-medium">Sub-brand (optional)</label>
            <input className="input" value={subBrand} onChange={(e) => setSubBrand(e.target.value)} />

            <label className="block text-sm font-medium">Perfume name *</label>
            <input className="input" value={perfumeName} onChange={(e) => setPerfumeName(e.target.value)} />

            <div>
              <label className="block text-sm font-medium">Type *</label>
              <input
                disabled
                className="input bg-gray-100 text-gray-500"
                value={listing.type}
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Images *</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              className="input"
            />

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} className="w-full h-24 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Type-specific section */}
        {listing.type === "intact" && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <input
              type="number"
              className="input"
              placeholder="Bottle size (ml)"
              value={bottleSize}
              onChange={(e) => setBottleSize(Number(e.target.value))}
            />
            <input
              type="number"
              className="input"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        )}

        {listing.type === "partial" && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <input
              type="number"
              className="input"
              placeholder="Amount left (ml)"
              value={partialLeft}
              onChange={(e) => setPartialLeft(Number(e.target.value))}
            />
            <input
              type="number"
              className="input"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        )}

        {listing.type === "decant" && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            {decants.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  type="number"
                  className="col-span-5 input"
                  placeholder="Size (ml)"
                  value={d.ml}
                  onChange={(e) =>
                    setDecants((prev) =>
                      prev.map((row, idx) =>
                        idx === i ? { ...row, ml: Number(e.target.value) } : row
                      )
                    )
                  }
                />
                <input
                  type="number"
                  className="col-span-5 input"
                  placeholder="Price"
                  value={d.price}
                  onChange={(e) =>
                    setDecants((prev) =>
                      prev.map((row, idx) =>
                        idx === i ? { ...row, price: Number(e.target.value) } : row
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="col-span-2 border rounded-lg hover:bg-gray-200"
                  onClick={() =>
                    setDecants((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  disabled={decants.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDecants((prev) => [...prev, { ml: 0, price: 0 }])}
              className="mt-2 border rounded-lg px-3 py-1 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add size
            </button>
          </div>
        )}

        {formError && <p className="text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
