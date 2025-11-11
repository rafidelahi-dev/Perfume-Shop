import { useState, useMemo, useEffect } from 'react';
import React from 'react'
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/key';
import { fetchMyListings, deleteMyListing } from '@/lib/queries/listings';
import { toast } from 'sonner';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export const ListingGrid = () => {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
      const fetchUser = async () => {
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id || null);
      };
      fetchUser();

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user?.id || null);
      });

      return () => listener.subscription.unsubscribe();
    }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const qc = useQueryClient();
    const router = useRouter();
    const { data, isLoading, error } = useQuery({
    queryKey: qk.userListings(userId),
    queryFn: fetchMyListings,
    enabled: !!userId,
    });

    const filteredListings = useMemo(() => {
    if (!data) return [];
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (l: any) =>
        l.brand?.toLowerCase().includes(lower) ||
        l.sub_brand?.toLowerCase().includes(lower) ||
        l.perfume_name?.toLowerCase().includes(lower)
    );
    }, [data, searchTerm]);

    const destroy = useMutation({
        mutationFn: (id: string) => deleteMyListing(id), // or your local delete function
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: qk.userListings(userId) }); // or ["my_listings"]
        toast.success("Listing deleted successfully!");
        },
    });
  
    function confirmAndDelete(id: string) {
    const ok = window.confirm("Delete this listing permanently?");
    if (!ok) return;
    destroy.mutate(id); // your delete mutation
    }

    if (userId === null) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
          <p className="text-gray-600 font-medium">Checking user session...</p>
        </div>
      );
    }


  return (
    <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your listings...</p>
          </div>
        ): error ? (
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
        ) : filteredListings && filteredListings.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((l: any) => {
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
          ) : (
            <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-gray-600">
              {searchTerm
                ? `No listings found matching “${searchTerm}”.`
                : "You have no listings yet. Add one using the form above."}
            </div>
          )}
      </div>
  )
}
