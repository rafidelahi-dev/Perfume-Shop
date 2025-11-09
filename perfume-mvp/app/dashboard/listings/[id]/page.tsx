"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, Upload, ArrowLeft, Save } from "lucide-react";
import { qk } from "@/lib/queries/key";

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
    queryKey: [qk.uniqueListing, id],
    queryFn: () => fetchListing(id),
  });

  // form state
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [perfumeName, setPerfumeName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState<string | "">("");
  const [bottleSize, setBottleSize] = useState<string | "">("");
  const [partialLeft, setPartialLeft] = useState<string | "">("");
  const [decants, setDecants] = useState<{ ml: string; price: string }[]>([]);

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
      // Convert existing numbers to strings for the form
      const decantOptions = listing.decant_options || [];
      setDecants(
        decantOptions.map((d: any) => ({
          ml: d.ml ? d.ml.toString() : "",
          price: d.price ? d.price.toString() : "",
        }))
      );
    }
  }, [listing]);

  type Listing = {
  id: string;
  brand: string;
  sub_brand: string | null;
  perfume_name: string;
  type: "intact" | "partial" | "decant";
  images: string[];
  price?: number | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: { ml: number; price: number }[];
};

  const save = useMutation({
  mutationFn: (patch: any) => updateListing(id, patch),

  // 1) Optimistic update
  onMutate: async (patch: any) => {
    await qc.cancelQueries({ queryKey: [qk.uniqueListing, id] });
    await qc.cancelQueries({ queryKey: qk.userListings });

    const prevDetail = qc.getQueryData<any>([qk.uniqueListing, id]);
    const prevList = qc.getQueryData<any[]>(qk.userListings);

    // optimistic detail
    qc.setQueryData<Listing>([qk.uniqueListing, id], (curr) => {
      if (!curr) return curr;
      return { ...curr, ...patch };
    });

    // optimistic list: replace the matching item by id (if present)
    qc.setQueryData<any[]>(qk.userListings, (curr) => {
      if (!Array.isArray(curr)) return curr;
      return curr.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });

    return { prevDetail, prevList };
  },

  // 2) Rollback on error
  onError: (_err, _patch, ctx) => {
    if (ctx?.prevDetail) qc.setQueryData([qk.uniqueListing, id], ctx.prevDetail);
    if (ctx?.prevList) qc.setQueryData(qk.userListings, ctx.prevList);
  },

  onSuccess: () => {
    // ✅ navigate after the server confirms success
    router.push("/dashboard/listings");
  },

  // 3) Final sync
  onSettled: () => {
    qc.invalidateQueries({ queryKey: [qk.uniqueListing, id] });
    qc.invalidateQueries({ queryKey: qk.userListings });
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
      // Convert strings to numbers for validation
      const valid = decants.filter((d) => {
        const mlNum = parseFloat(d.ml);
        const priceNum = parseFloat(d.price);
        return mlNum > 0 && priceNum > 0;
      });
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
      // Convert strings back to numbers for saving
      patch.decant_options = decants.map((d) => ({
        ml: parseFloat(d.ml) || 0,
        price: parseFloat(d.price) || 0,
      }));
    }

    setSaving(true);
    save.mutate(patch, {
      onSettled: () => setSaving(false),
      onError: (e: any) => setFormError(e.message),
    });
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 text-lg font-semibold">Error loading listing</div>
        <button 
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go Back
        </button>
      </div>
    </div>
  );
  
  if (!listing) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-600 text-lg">Listing not found</div>
        <button 
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to listings
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
          <p className="text-gray-600 mt-2">Update your perfume listing details</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Main Content Grid */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Product Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand *
                      </label>
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g., Chanel, Dior, Creed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sub-brand (optional)
                      </label>
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        value={subBrand}
                        onChange={(e) => setSubBrand(e.target.value)}
                        placeholder="e.g., Les Exclusifs, Privée"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Perfume Name *
                      </label>
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        value={perfumeName}
                        onChange={(e) => setPerfumeName(e.target.value)}
                        placeholder="e.g., Bleu de Chanel, Aventus"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Listing Type
                      </label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                        {listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Type-specific Pricing Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Details</h3>
                  
                  {listing.type === "intact" && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bottle Size (ml) *
                          </label>
                          <input
                            type="number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="Bottle size (ml)"
                            value={bottleSize}
                            onChange={(e) => setBottleSize(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price ($) *
                          </label>
                          <input
                            type="number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="250"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {listing.type === "partial" && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount Left (ml) *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Amount left (ml)"
                        value={partialLeft}
                        onChange={(e) => setPartialLeft(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="150"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

                  {listing.type === "decant" && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decant Options *
                    </label>
                    {decants.map((d, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-5">
                          <label className="block text-xs text-gray-500 mb-1">Size (ml)</label>
                          <input
                            type="number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="10"
                            value={d.ml}
                            onChange={(e) =>
                              setDecants((prev) =>
                                prev.map((row, idx) =>
                                  idx === i ? { ...row, ml: e.target.value } : row
                                )
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <label className="block text-xs text-gray-500 mb-1">Price ($)</label>
                          <input
                            type="number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="25"
                            value={d.price}
                            onChange={(e) =>
                              setDecants((prev) =>
                                prev.map((row, idx) =>
                                  idx === i ? { ...row, price: e.target.value } : row
                                )
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            className="w-full px-3 py-3 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() =>
                              setDecants((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            disabled={decants.length === 1}
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setDecants((prev) => [...prev, { ml: "", price: "" }])}
                      className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Decant Size
                    </button>
                  </div>
                )}
                </div>
              </div>

              {/* Right Column - Images */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Images</h3>
                  
                  {/* Image Upload Area */}
                  <div 
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors group"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4 group-hover:text-indigo-500" />
                    <p className="text-gray-600 font-medium mb-1">Click to upload images</p>
                    <p className="text-gray-500 text-sm">PNG, JPG, WEBP up to 10MB</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Image Gallery */}
                  {images.length > 0 && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Uploaded Images ({images.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {images.map((url) => (
                          <div key={url} className="relative group">
                            <img 
                              src={url} 
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-75 transition-opacity"
                              alt="Product preview"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(url)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}