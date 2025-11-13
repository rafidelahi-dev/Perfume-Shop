"use client";
import { useState, useMemo, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import { fetchMyListings, deleteMyListing } from "@/lib/queries/listings";
import { toast } from "sonner";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

// 🔹 Shape of a listing as used in this component
export interface Listing {
  id: string;
  brand: string | null;
  sub_brand?: string | null;
  perfume_name: string | null;
  type: string | null;
  min_price?: number | null;
  price: number | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: { ml: number; price: number }[] | null;
  images?: string[] | null;
}

// 🔹 Props (currently not used, but kept if you want to reuse later)
interface ListingGridProps {
  listings?: Listing[];
  emptyText?: string;
}

export const ListingGrid: React.FC<ListingGridProps> = () => {
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

  const [searchTerm, setSearchTerm] = useState("");
  const qc = useQueryClient();
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
  } = useQuery<Listing[], unknown>({
    queryKey: qk.userListings(userId),
    queryFn: fetchMyListings,
    enabled: !!userId,
  });

  const filteredListings: Listing[] = useMemo(() => {
    if (!data) return [];
    const lower = searchTerm.toLowerCase();
    return data.filter((l) => {
      const brand = l.brand ?? "";
      const sub = l.sub_brand ?? "";
      const name = l.perfume_name ?? "";
      return (
        brand.toLowerCase().includes(lower) ||
        sub.toLowerCase().includes(lower) ||
        name.toLowerCase().includes(lower)
      );
    });
  }, [data, searchTerm]);

  const destroy = useMutation({
    mutationFn: (id: string) => deleteMyListing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userListings(userId) });
      toast.success("Listing deleted successfully!");
    },
  });

  function confirmAndDelete(id: string) {
    const ok = window.confirm("Delete this listing permanently?");
    if (!ok) return;
    destroy.mutate(id);
  }

  if (userId === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
        <p className="text-gray-600 font-medium">Checking user session...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your listings...</p>
      </div>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    return (
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
          There was an error loading your perfume listings: {message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {filteredListings && filteredListings.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((l) => {
            const fromPrice =
              typeof l.min_price === "number"
                ? Number(l.min_price)
                : l.price != null
                ? Number(l.price)
                : null;

            return (
              <li
                key={l.id}
                className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm"
              >
                {l.images?.[0] && (
                  <Image
                    src={l.images[0]}
                    alt={`${l.brand ?? ""} ${l.perfume_name ?? ""}`}
                    width={800}
                    height={600}
                    className="w-full h-40 object-cover rounded-t-xl"
                  />
                )}
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {l.brand}
                    {l.sub_brand ? ` • ${l.sub_brand}` : ""}
                  </div>
                  <h4 className="mt-1 font-semibold">{l.perfume_name}</h4>

                  <div className="mt-2">
                    <span className="inline-block rounded-full bg-[#f8f7f3] px-2 py-1 text-xs capitalize">
                      {l.type}
                    </span>
                    <button
                      onClick={() =>
                        router.push(`/dashboard/listings/${l.id}`)
                      }
                      className="ml-2 rounded-full border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmAndDelete(l.id)}
                      className="ml-1 rounded-full border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
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
                      {typeof fromPrice === "number" &&
                        !Number.isNaN(fromPrice) && (
                          <div className="font-medium mt-1">
                            ${fromPrice.toFixed(2)}
                          </div>
                        )}
                    </div>
                  ) : (
                    <DecantBlock
                      options={l.decant_options ?? undefined}
                      fromPrice={fromPrice}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
          {searchTerm
            ? `No listings found matching “${searchTerm}”.`
            : "You have no listings yet. Add one using the form above."}
        </div>
      )}
    </div>
  );
};

// 🧩 Subcomponent for decant listings
function DecantBlock({
  options,
  fromPrice,
}: {
  options?: { ml: number; price: number }[];
  fromPrice: number | null;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...(options ?? [])].sort((a, b) => a.ml - b.ml),
    [options]
  );
  const inline = sorted.slice(0, 3);
  const remaining = sorted.length - inline.length;

  return (
    <div className="mt-2 text-sm text-gray-700 relative">
      {typeof fromPrice === "number" && !Number.isNaN(fromPrice) && (
        <div>
          From <span className="font-medium">${fromPrice.toFixed(2)}</span>
        </div>
      )}

      {Array.isArray(options) && options.length > 0 ? (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {inline.map((d, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full border border-[#d4af37]/40 bg-[#fff6dc] px-2.5 py-1 text-[11px] text-[#6b5600]"
              >
                {d.ml} ml • ${d.price}
              </span>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[11px] hover:bg-[#f7f3e6]"
              >
                +{remaining} more
              </button>
            )}
          </div>

          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <div className="relative z-10 w-80 max-h-[70vh] overflow-auto rounded-2xl bg-white p-4 shadow-2xl">
                <h4 className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                  All decant sizes
                </h4>
                <div className="divide-y divide-gray-100">
                  {sorted.map((o, i) => {
                    const ppm = o.price / Math.max(1, o.ml);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span>{o.ml} ml</span>
                        <span>
                          ${o.price}{" "}
                          <span className="text-gray-500 text-xs">
                            (${ppm.toFixed(2)}/ml)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full rounded-full bg-[#d4af37] px-4 py-2 text-sm text-white hover:bg-[#c39a2e]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-2">No decant sizes listed</div>
      )}
    </div>
  );
}
