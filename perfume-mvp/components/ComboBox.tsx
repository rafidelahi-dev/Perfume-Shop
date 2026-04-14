"use client";

import { useEffect, useRef, useState } from "react";

type ComboBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  suggestions: string[];
  label: string;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
};

export default function ComboBox({
  value,
  onChange,
  onSelect,
  suggestions,
  label,
  placeholder,
  required,
  inputClassName,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlighted(-1);
  }, [suggestions]);

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const visible = open && suggestions.length > 0 && value.length >= 1;

  function select(val: string) {
    onChange(val);
    onSelect?.(val);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-[#1a1a1a]">
        {label}
        {required && " *"}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={
          inputClassName ??
          "mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {visible && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-md">
          {suggestions.slice(0, 8).map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? "bg-black/5 font-medium" : "hover:bg-black/5"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
