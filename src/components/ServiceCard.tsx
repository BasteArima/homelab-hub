import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Circle, ExternalLink } from "lucide-react";
import { pingService, resolveServiceUrl, type Service } from "@/lib/services-config";

export function ServiceCard({ service }: { service: Service }) {
  const [status, setStatus] = useState<{ online: boolean; rtt: number | null } | null>(null);
  const [loading, setLoading] = useState(service.isVps);

  useEffect(() => {
    if (!service.isVps) return;
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
  }, [service.domain, service.isVps]);

  const Icon = (Icons[service.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.Box;
  const href = resolveServiceUrl(service);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card group relative flex flex-col gap-3 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">{service.name}</h3>
        {service.description && (
          <p className="truncate text-xs text-muted-foreground">{service.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {service.domain}
        </span>
        {service.isVps && (
          <div className="flex items-center gap-1.5">
            {loading ? (
              <>
                <Circle className="h-2 w-2 animate-pulse fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] text-yellow-400/80">...</span>
              </>
            ) : status?.online ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-medium text-emerald-400">{status.rtt}ms</span>
              </>
            ) : (
              <>
                <Circle className="h-2 w-2 fill-rose-500 text-rose-500" />
                <span className="text-[10px] font-medium text-rose-400">Offline</span>
              </>
            )}
          </div>
        )}
      </div>
    </a>
  );
}