"use client";

import { useMemo, useState } from "react";

export interface SearchableOption {
  value: number;
  label: string;
  sublabel?: string;
}

/**
 * Client-side searchable dropdown — filters an already-loaded list of
 * options rather than hitting a search API per keystroke. Fine for a
 * single shop's customer/fabric/staff lists; revisit with a real
 * search endpoint if any of these lists grow into the thousands.
 */
export function SearchableSelect({
  name,
  label,
  options,
  required,
  error,
  placeholder = "Type to search…",
}: {
  name: string;
  label: string;
  options: SearchableOption[];
  required?: boolean;
  error?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchableOption | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)).slice(0, 20);
  }, [query, options]);

  return (
    <div className="flex flex-col gap-1 relative">
      <span className="text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input type="hidden" name={name} value={selected?.value ?? ""} />
      <input
        type="text"
        value={selected ? selected.label : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 z-10 w-full max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => {
                setSelected(o);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex flex-col"
            >
              <span className="text-slate-900">{o.label}</span>
              {o.sublabel && <span className="text-xs text-slate-400">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
      {error?.[0] && <span className="text-xs text-red-500">{error[0]}</span>}
    </div>
  );
}
