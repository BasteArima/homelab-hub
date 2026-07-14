import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Search, CornerDownLeft } from "lucide-react";
import { resolveServiceUrl, type Service } from "@/lib/services-config";
import { resolveIcon } from "@/lib/logos";

type Props = {
  open: boolean;
  onClose: () => void;
  services: Service[];
};

export function CommandPalette({ open, onClose, services }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return services;
    return services.filter((s) => {
      const hay = `${s.name} ${s.group} ${s.domain} ${s.id}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [query, services]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const openService = (svc: Service | undefined) => {
    if (!svc) return;
    window.open(resolveServiceUrl(svc), "_blank", "noopener,noreferrer");
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openService(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a service…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No services found.</p>
          ) : (
            results.map((svc, i) => (
              <button
                key={svc.id}
                data-active={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => openService(svc)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[active=true]:bg-white/10"
              >
                <ItemIcon service={svc} />
                <span className="min-w-0 flex-1 truncate font-medium">{svc.name || svc.id}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {svc.group}
                </span>
                <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-data-[active=true]:opacity-100" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ItemIcon({ service }: { service: Service }) {
  const iconR = resolveIcon(service);
  if (iconR.kind === "logo" || iconR.kind === "url") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <img src={iconR.src} alt="" className="h-4 w-4 object-contain" />
      </span>
    );
  }
  const Lucide =
    (Icons[iconR.name as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ??
    Icons.Box;
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-primary">
      <Lucide className="h-4 w-4" />
    </span>
  );
}
