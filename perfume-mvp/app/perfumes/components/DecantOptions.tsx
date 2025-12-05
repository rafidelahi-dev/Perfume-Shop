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

  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-[#d4af37]/40 bg-[#fff6dc] px-2.5 py-1 text-[11px] text-[#6b5600]">
      {children}
    </span>
  );

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 relative" ref={popRef}>
      {inline.map((o, i) => (
        <Chip key={i}>
          {o.ml} ml • ${o.price}
        </Chip>
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[11px] hover:bg-[#f7f3e6]"
        >
          +{remaining} more
        </button>
      )}

      {open && remaining > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* backdrop */}
            <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* modal */}
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

    </div>
  );
}
