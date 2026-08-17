"use client";

import { useEffect, useState } from "react";
import ComboBox from "@/components/ComboBox";
import { createPublicSupabase } from "@/lib/queries/perfumes";

type PerfumeMatch = { id: string; name: string; brand: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (match: PerfumeMatch | null) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
};

function formatSuggestion(p: PerfumeMatch): string {
  return p.name.startsWith(p.brand) ? p.name : `${p.brand} ${p.name}`;
}

export default function PerfumeComboBox({ value, onChange, onSelect, label, placeholder, required }: Props) {
  const [matches, setMatches] = useState<PerfumeMatch[]>([]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createPublicSupabase();
      const { data } = await supabase
        .from("perfumes")
        .select("id, name, brand")
        .or(`name.ilike.%${value}%,brand.ilike.%${value}%`)
        .limit(8);
      if (!cancelled) setMatches((data ?? []) as PerfumeMatch[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const suggestions = matches.map(formatSuggestion);

  return (
    <ComboBox
      value={value}
      onChange={(v) => {
        onChange(v);
        onSelect(null);
      }}
      onSelect={(v) => {
        const match = matches.find((m) => formatSuggestion(m) === v) ?? null;
        onSelect(match);
      }}
      suggestions={suggestions}
      label={label}
      placeholder={placeholder}
      required={required}
    />
  );
}
