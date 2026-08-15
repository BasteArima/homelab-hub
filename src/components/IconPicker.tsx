import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Search, X, Sparkles } from "lucide-react";
import { LOGO_SLUGS, canonicalSlug, logoUrl } from "@/lib/logos";
import { useI18n, type TFn } from "@/lib/i18n";

type IconComponent = React.ComponentType<{ className?: string }>;

// All real lucide icon names: PascalCase, excluding the `*Icon` aliases and
// deprecated `Lucide*` duplicates, plus non-icon exports (createLucideIcon…).
const ICON_NAMES = Object.keys(Icons)
  .filter((k) => /^[A-Z][A-Za-z0-9]*$/.test(k) && !k.endsWith("Icon") && !k.startsWith("Lucide"))
  .sort();

function lucideOf(name: string): IconComponent {
  return (Icons[name as keyof typeof Icons] as IconComponent) ?? Icons.Box;
}

const MAX_LUCIDE = 90;
const MAX_LOGOS = 48;

type Props = { value: string; onChange: (v: string) => void; autoSlug?: string | null };

export function IconPicker({ value, onChange, autoSlug }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const logos = useMemo(
    () => (q ? LOGO_SLUGS.filter((s) => s.includes(q)).slice(0, MAX_LOGOS) : []),
    [q],
  );
  const lucides = useMemo(() => {
    const list = q ? ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : ICON_NAMES;
    return list.slice(0, MAX_LUCIDE);
  }, [q]);

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

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("icon")}
        <a
          href="https://dashboardicons.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary/70 hover:text-primary"
          title={t("browse_brand_logos")}
        >
          ↗
        </a>
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border border-hairline bg-field px-2 py-1.5 text-left text-xs text-foreground outline-none hover:border-primary/40 focus:border-primary/60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded bg-fill1">
          <TriggerIcon value={value} autoSlug={autoSlug} />
        </span>
        <span className="truncate">{labelFor(value, autoSlug, t)}</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-xl border border-hairline bg-popbg p-2 shadow-2xl">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-hairline bg-field px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_logos_icons")}
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

          <button
            type="button"
            onClick={() => pick("")}
            className={`mb-2 flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] ${
              value === ""
                ? "border-primary/60 text-foreground"
                : "border-hairline text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            {t("auto")} {autoSlug ? `(logo: ${autoSlug})` : `(${t("icon_from_name")})`}
          </button>

          <div className="max-h-60 overflow-y-auto">
            {logos.length > 0 && (
              <>
                <p className="px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {t("logos")}
                </p>
                <div className="mb-2 grid grid-cols-6 gap-1">
                  {logos.map((slug) => {
                    const active = value === `logo:${slug}`;
                    return (
                      <button
                        key={slug}
                        type="button"
                        title={slug}
                        onClick={() => pick(`logo:${slug}`)}
                        className={`flex h-9 items-center justify-center rounded-lg border transition-colors ${
                          active
                            ? "border-primary/60 bg-primary/10"
                            : "border-transparent hover:border-hairline hover:bg-fill1"
                        }`}
                      >
                        <img src={logoUrl(slug)} alt="" className="h-5 w-5 object-contain" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <p className="px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {t("icons")}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {lucides.map((name) => {
                const Cmp = lucideOf(name);
                const active = value === `lucide:${name}` || value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => pick(`lucide:${name}`)}
                    className={`flex h-9 items-center justify-center rounded-lg border transition-colors ${
                      active
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-transparent text-foreground hover:border-hairline hover:bg-fill1"
                    }`}
                  >
                    <Cmp className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
            {q
              ? t("counts_logos_icons", { logos: logos.length, icons: lucides.length })
              : t("type_to_find_logos")}
          </p>
        </div>
      )}
    </div>
  );
}

function TriggerIcon({ value, autoSlug }: { value: string; autoSlug?: string | null }) {
  if (value.startsWith("logo:")) {
    const slug = canonicalSlug(value.slice(5)) ?? value.slice(5);
    return <img src={logoUrl(slug)} alt="" className="h-4 w-4 object-contain" />;
  }
  if (/^https?:\/\//i.test(value))
    return <img src={value} alt="" className="h-4 w-4 object-contain" />;
  if (value === "" && autoSlug)
    return <img src={logoUrl(autoSlug)} alt="" className="h-4 w-4 object-contain" />;
  const name = value.startsWith("lucide:") ? value.slice(7) : value || "Box";
  const Cmp = lucideOf(name);
  return <Cmp className="h-4 w-4 text-primary" />;
}

function labelFor(value: string, autoSlug: string | null | undefined, t: TFn): string {
  if (value.startsWith("logo:")) return value.slice(5);
  if (value.startsWith("lucide:")) return value.slice(7);
  if (/^https?:\/\//i.test(value)) return t("custom_url");
  if (value === "") return autoSlug ? `${t("auto")} · ${autoSlug}` : t("auto");
  return value;
}
