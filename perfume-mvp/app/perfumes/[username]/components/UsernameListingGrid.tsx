// app/perfumes/[username]/UsernameListingGrid.tsx
"use client";

type SellerListing = {
  id: string;
  brand: string;
  perfume_name: string;
  sub_brand: string | null;
  price: number;
  type: string;
  min_price: number | null;
  images: string[] | null;
  profiles?: {
    username: string;
    display_name: string | null;
  };
};

export function UsernameListingGrid({
  listings,
  emptyText,
}: {
  listings: SellerListing[];
  emptyText?: string;
}) {
  if (!listings || listings.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        {emptyText ?? "No listings found."}
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {listings.map((l) => (
        <article
          key={l.id}
          className="rounded-lg border bg-white p-4 flex flex-col"
        >
          {/* Image (first one) */}
          {l.images && l.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.images[0]}
              alt={l.perfume_name}
              className="mb-3 h-40 w-full rounded-md object-cover"
            />
          ) : (
            <div className="mb-3 h-40 w-full rounded-md bg-gray-100" />
          )}

          {/* Text info */}
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {l.brand}
            </div>
            <div className="font-semibold">{l.perfume_name}</div>
            {l.sub_brand && (
              <div className="text-xs text-gray-500">{l.sub_brand}</div>
            )}

            <div className="mt-2 text-sm text-gray-700">
              {l.type}
              {l.min_price != null && (
                <>
                  {" · from "}
                  <span className="font-semibold">
                    {l.min_price.toFixed(2)}
                  </span>
                </>
              )}
              {l.min_price == null && (
                <>
                  {" · "}
                  <span className="font-semibold">
                    {l.price.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seller name (optional) */}
          {l.profiles && (
            <div className="mt-3 text-xs text-gray-500">
              Seller:{" "}
              <span className="font-medium">
                {l.profiles.display_name ?? l.profiles.username}
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
