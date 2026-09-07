import { createContext, useContext, useEffect, useState } from "react";

export type PingResult = { online: boolean; rtt: number | null; status: number | null };

type StatusMap = Record<string, PingResult>;

const StatusContext = createContext<{ map: StatusMap; loading: boolean }>({
  map: {},
  loading: false,
});

const REFRESH_MS = 60000;

/**
 * Polls /api/ping once for every card. The check runs on the server, which sits
 * inside the LAN: that avoids mixed-content blocking when the hub is served over
 * https, reaches private addresses regardless of where the browser is, and can
 * read real HTTP statuses instead of opaque no-cors responses.
 */
export function StatusProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const [map, setMap] = useState<StatusMap>({});
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/ping", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as StatusMap;
        if (mounted) setMap(data);
      } catch {
        if (mounted) setMap({});
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    const timer = setInterval(run, REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [enabled]);

  return <StatusContext.Provider value={{ map, loading }}>{children}</StatusContext.Provider>;
}

/** Status for one service, plus whether the first poll is still in flight. */
export function useServiceStatus(id: string): { result: PingResult | null; loading: boolean } {
  const { map, loading } = useContext(StatusContext);
  return { result: map[id] ?? null, loading };
}
