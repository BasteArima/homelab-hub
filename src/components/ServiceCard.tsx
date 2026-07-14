import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ExternalLink, Pencil, X, ChevronUp, ChevronDown } from "lucide-react";
import { pingService, resolveServiceUrl, type Service } from "@/lib/services-config";
import { resolveServiceColor, type ResolvedColor } from "@/lib/service-colors";
import { resolveIcon } from "@/lib/logos";

export type Density = "comfortable" | "compact" | "list";

type Props = {
  service: Service;
  /** Group-aware resolved color. Falls back to standalone resolution when omitted. */
  color?: ResolvedColor;
  density?: Density;
  editing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Touch/keyboard reorder within the group; omitted at the group's edges. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
  showDropIndicator?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
};

export function ServiceCard({
  service,
  color: colorProp,
  density = "comfortable",
  editing = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isDragging = false,
  showDropIndicator = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const [status, setStatus] = useState<{ online: boolean; rtt: number | null } | null>(null);
  const [loading, setLoading] = useState(service.isVps);
  const [imgError, setImgError] = useState(false);

  useEffect(() => setImgError(false), [service.icon]);

  useEffect(() => {
    if (!service.isVps || editing) return;
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const r = await pingService(service.domain);
      if (mounted) {
        setStatus(r);
        setLoading(false);
      }
    };
    run();
    const interval = setInterval(run, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [service.domain, service.isVps, editing]);

  const iconR = resolveIcon(service);
  const showLogo = (iconR.kind === "logo" || iconR.kind === "url") && !imgError;
  const lucideName = iconR.kind === "lucide" ? iconR.name : "Box";
  const LucideIcon =
    (Icons[lucideName as keyof typeof Icons] as React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>) ?? Icons.Box;
  const color = colorProp ?? resolveServiceColor(service);
  const isOffline = service.isVps && !editing && !loading && status !== null && !status.online;

  // Icon tile at a given size (box = tile, media = image/glyph).
  const tile = (box: string, media: string) =>
    showLogo ? (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10`}
      >
        <img
          src={iconR.src}
          alt=""
          className={`${media} object-contain`}
          onError={() => setImgError(true)}
        />
      </div>
    ) : (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-xl`}
        style={{ background: color.bg, boxShadow: `inset 0 0 0 1px ${color.ring}` }}
      >
        <LucideIcon className={media} style={{ color: color.fg }} />
      </div>
    );

  const statusEl =
    service.isVps && !editing ? (
      <div
        className="flex shrink-0 items-center gap-1.5"
        title={status ? (status.online ? `${status.rtt}ms` : "Offline") : "Checking…"}
      >
        {loading ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400/90" />
        ) : status?.online ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
              {status.rtt}ms
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-[10px] font-medium text-rose-400 opacity-0 transition-opacity group-hover:opacity-100">
              Offline
            </span>
          </>
        )}
      </div>
    ) : null;

  // Comfortable vertical layout — also used for edit mode.
  const verticalInner = (
    <>
      <div className="flex items-start justify-between">
        {tile("h-11 w-11", "h-6 w-6")}
        {editing ? (
          <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ) : (
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {service.name || "Untitled"}
        </h3>
        {service.description && (
          <p className="truncate text-xs text-muted-foreground">{service.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {service.domain}
        </span>
        {statusEl}
        {service.isVps && editing && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
            ping
          </span>
        )}
      </div>
    </>
  );

  if (editing) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={onEdit}
        className={`glass-card group relative flex cursor-pointer flex-col gap-3 rounded-2xl p-5 ${
          isDragging ? "opacity-40" : ""
        } ${showDropIndicator ? "ring-2 ring-primary" : ""}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          title="Delete service"
          className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-rose-500/40 bg-rose-950/80 text-rose-300 opacity-0 shadow-lg transition-opacity hover:bg-rose-900 group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {(onMoveUp || onMoveDown) && (
          <div className="absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 overflow-hidden rounded-full border border-white/15 bg-[oklch(0.2_0.025_265)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!onMoveUp}
              title="Move up"
              aria-label="Move up"
              className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!onMoveDown}
              title="Move down"
              aria-label="Move down"
              className="flex h-7 w-7 items-center justify-center border-l border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
        {verticalInner}
      </div>
    );
  }

  const offlineDim = isOffline ? "opacity-55 hover:opacity-100" : "";
  const link = {
    href: resolveServiceUrl(service),
    target: "_blank",
    rel: "noopener noreferrer",
  } as const;

  if (density === "list") {
    return (
      <a
        {...link}
        className={`glass-card group flex items-center gap-3 rounded-xl p-2.5 ${offlineDim}`}
      >
        {tile("h-9 w-9", "h-5 w-5")}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">
            {service.name || "Untitled"}
          </h3>
          {service.description && (
            <p className="truncate text-[11px] text-muted-foreground">{service.description}</p>
          )}
        </div>
        <span className="hidden shrink-0 truncate text-[10px] uppercase tracking-wider text-muted-foreground/60 sm:inline">
          {service.domain}
        </span>
        {statusEl}
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    );
  }

  if (density === "compact") {
    return (
      <a {...link} className={`glass-card group flex flex-col gap-2 rounded-xl p-3 ${offlineDim}`}>
        <div className="flex items-start justify-between">
          {tile("h-9 w-9", "h-5 w-5")}
          {statusEl ?? (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
        <h3 className="truncate text-xs font-medium text-foreground">
          {service.name || "Untitled"}
        </h3>
      </a>
    );
  }

  return (
    <a
      {...link}
      className={`glass-card group relative flex flex-col gap-3 rounded-2xl p-5 ${offlineDim}`}
    >
      {verticalInner}
    </a>
  );
}
