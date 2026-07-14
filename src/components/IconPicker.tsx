import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Search, X } from "lucide-react";

type IconComponent = React.ComponentType<{ className?: string }>;

// All real lucide icon names: PascalCase, excluding the `*Icon` aliases and
// deprecated `Lucide*` duplicates, plus non-icon exports (createLucideIcon…).
const ICON_NAMES = Object.keys(Icons)
  .filter((k) => /^[A-Z][A-Za-z0-9]*$/.test(k) && !k.endsWith("Icon") && !k.startsWith("Lucide"))
  .sort();

function iconOf(name: string): IconComponent {
  return (Icons[name as keyof typeof Icons] as IconComponent) ?? Icons.Box;
}

const MAX_RESULTS = 120;

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : ICON_NAMES;
    return list.slice(0, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Current = iconOf(value);

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Icon
        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary/70 hover:text-primary"
          title="Browse all icons"
        >
          ↗
        </a>
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-left text-xs text-foreground outline-none hover:border-primary/40 focus:border-primary/60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5">
          <Current className="h-4 w-4 text-primary" />
        </span>
        <span className="truncate">{value || "Pick an icon"}</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-xl border border-white/10 bg-[oklch(0.2_0.025_265)] p-2 shadow-2xl">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
            {results.map((name) => {
              const Cmp = iconOf(name);
              const active = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={`flex h-9 items-center justify-center rounded-lg border transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-transparent text-foreground hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <Cmp className="h-4 w-4" />
                </button>
              );
            })}
            {results.length === 0 && (
              <p className="col-span-6 py-4 text-center text-[11px] text-muted-foreground">
                No icons match “{query}”
              </p>
            )}
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
            {query ? `${results.length} shown` : `${ICON_NAMES.length} icons — type to search`}
          </p>
        </div>
      )}
    </div>
  );
}
