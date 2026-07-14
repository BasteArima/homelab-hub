import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ExternalLink, Pencil, X } from "lucide-react";
import { pingService, resolveServiceUrl, type Service } from "@/lib/services-config";
import { resolveServiceColor, type ResolvedColor } from "@/lib/service-colors";

type Props = {
  service: Service;
  /** Group-aware resolved color. Falls back to standalone resolution when omitted. */
  color?: ResolvedColor;
  editing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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
  editing = false,
  onEdit,
  onDelete,
  isDragging = false,
  showDropIndicator = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const [status, setStatus] = useState<{ online: boolean; rtt: number | null } | null>(null);
  const [loading, setLoading] = useState(service.isVps);

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

  const Icon =
    (Icons[service.icon as keyof typeof Icons] as React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>) ?? Icons.Box;
  const color = colorProp ?? resolveServiceColor(service);
  const isOffline = service.isVps && !editing && !loading && status !== null && !status.online;

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: color.bg, boxShadow: `inset 0 0 0 1px ${color.ring}` }}
        >
          <Icon className="h-5 w-5" style={{ color: color.fg }} />
        </div>
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
        {service.isVps && !editing && (
          <div
            className="flex items-center gap-1.5"
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
        )}
        {service.isVps && editing && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
            ping
          </span>
        )}
      </div>
    </>
  );

  if (!editing) {
    return (
      <a
        href={resolveServiceUrl(service)}
        target="_blank"
        rel="noopener noreferrer"
        className={`glass-card group relative flex flex-col gap-3 rounded-2xl p-5 ${
          isOffline ? "opacity-55 hover:opacity-100" : ""
        }`}
      >
        {inner}
      </a>
    );
  }

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
      {inner}
    </div>
  );
}
