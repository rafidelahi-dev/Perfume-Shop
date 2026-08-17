import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  brand: string;
  accords: string[];
};

export default function SimilarPerfumeCard({ slug, name, brand, accords }: Props) {
  return (
    <Link
      href={`/fragrance/${slug}`}
      className="group flex flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#d4af37]/30 transition-all"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37] mb-1">
        {brand}
      </span>
      <h3 className="font-serif font-semibold text-[#1a1a1a] text-base leading-snug mb-2">
        {name}
      </h3>
      {accords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {accords.slice(0, 3).map((a) => (
            <span
              key={a}
              className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 capitalize"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
