"use client";

type BrandRow = {
  brand: string;
  total: number;
};

export default function TrendingBrands({ brands }: { brands: BrandRow[] }) {
  if (!brands || brands.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-px w-12 bg-gray-300 mb-4" />
        <p className="text-gray-500 font-light italic">
          No trending brands data available yet.
        </p>
      </div>
    );

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Optional Header - styled more subtly since tabs usually handle the title */}
      <div className="flex items-center gap-4 mb-8">
         <h3 className="text-xl font-serif text-[#1a1a1a]">Top Brands</h3>
         <div className="h-px flex-1 bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b, i) => (
          <div
            key={b.brand}
            // Card Container
            className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#d4af37]/30"
          >
            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative flex items-center justify-between">
              
              <div className="flex items-center gap-4">
                {/* Ranking Circle */}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f7f3] text-xs font-bold text-gray-400 transition-colors group-hover:bg-[#1a1a1a] group-hover:text-[#d4af37]">
                  {i + 1}
                </span>
                
                {/* Brand Name */}
                <span className="text-lg font-serif text-[#1a1a1a] group-hover:text-[#d4af37] transition-colors">
                  {b.brand}
                </span>
              </div>

              {/* View Count Badge */}
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-[#1a1a1a]">
                    {b.total}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                    Views
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}