"use client";

type BrandRow = {
  brand: string;
  total: number;
};

export default function TrendingBrands({ brands }: { brands: BrandRow[] }) {
  if (!brands || brands.length === 0)
    return (
      <p className="text-center text-gray-600 mt-6">
        No trending brands available.
      </p>
    );

  return (
    <div className="mt-10">
      <h3 className="text-xl font-light mb-6 text-[#111]">Top Brands</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((b, i) => (
          <div
            key={b.brand}
            className="p-6 rounded-2xl bg-white/80 border border-black/5 shadow hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">{b.brand}</span>
              <span className="text-sm px-3 py-1 rounded-full bg-[#1a1a1a] text-white">
                {b.total} views
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
