"use client";
import { useState, useMemo, useRef, useEffect } from "react";

type DecantOption = { ml: number; price: number; stock?: number };
export default function DecantOptions({
  options,
  maxInline = 3,
}: { options: DecantOption[]; maxInline?: number }) {
  const sorted = useMemo(
    () => [...(options ?? [])].sort((a, b) => a.ml - b.ml),
    [options]
  );

  const inline = sorted.slice(0, maxInline);
  const remaining = sorted.length - inline.length;

  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Styled Chip Component
  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-[#d4af37]/50 bg-[#fffaf2] px-2.5 py-1 text-[11px] text-[#6b5600] font-medium hover:bg-[#d4af37]/10 transition">
      {children}
    </span>
  );

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 relative" ref={popRef}>
      {inline.map((o, i) => (
        <Chip key={i}>
          {o.ml} ml • TK{o.price}
        </Chip>
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          // More button style
          className="inline-flex items-center rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-[#1a1a1a] hover:bg-[#f2eee4] transition"
        >
          +{remaining} more
        </button>
      )}

      {open && remaining > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* backdrop */}
            <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* modal */}
            <div className="relative z-10 w-80 max-h-[70vh] overflow-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="mb-4 text-lg font-serif font-semibold text-[#1a1a1a]">
                Available Decant Sizes
            </h4>
            <div className="divide-y divide-gray-100">
                {sorted.map((o, i) => {
                const ppm = o.price / Math.max(1, o.ml);
                return (
                    <div
                    key={i}
                    className="flex items-center justify-between py-3 text-sm text-[#1a1a1a]"
                    >
                    <span>
                        <b className="font-semibold">{o.ml} ml</b>
                        <span className="text-xs text-gray-500 ml-2">(TK{ppm.toFixed(2)}/ml)</span>
                    </span>
                    <span className="font-bold text-[#d4af37]">
                        TK{o.price.toFixed(2)}
                    </span>
                    </div>
                );
                })}
            </div>
            <button
                onClick={() => setOpen(false)}
                className="mt-6 w-full rounded-full bg-[#d4af37] px-4 py-3 text-sm font-medium text-white hover:bg-[#c39a2e] transition shadow"
            >
                Close
            </button>
            </div>
        </div>
        )}

    </div>
  );
}