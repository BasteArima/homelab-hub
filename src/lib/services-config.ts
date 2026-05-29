export type Service = {
  id: string;
  name: string;
  group: string;
  icon: string;
  localPort: number;
  localPath: string;
  domain: string;
  isVps: boolean;
  description?: string;
  /** "http" or "https" — applied to the resolved URL (both local & remote). Defaults to "http". */
  protocol?: "http" | "https";
  /** Optional fixed LAN host/IP for services that run on a different machine than this dashboard. When set, local access uses this host instead of window.location.hostname. */
  localHost?: string;
};

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch("/api/services", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load services: ${res.status}`);
  return res.json();
}

export async function saveServices(services: Service[], adminPassword: string): Promise<void> {
  const res = await fetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword, services }),
  });
  if (res.status === 401) throw new Error("Invalid password");
  if (!res.ok) throw new Error(`Save failed: ${res.status} ${await res.text()}`);
}

export function resolveServiceUrl(svc: Service): string {
  const protocol = svc.protocol === "https" ? "https" : "http";
  if (typeof window === "undefined") return `https://${svc.domain}${svc.localPath}`;
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  if (isLocal) {
    const localHost = svc.localHost && svc.localHost.trim() ? svc.localHost.trim() : host;
    return `${protocol}://${localHost}:${svc.localPort}${svc.localPath}`;
  }
  return `${svc.protocol === "http" ? "http" : "https"}://${svc.domain}${svc.localPath}`;
}

export async function pingService(domain: string, timeoutMs = 5000): Promise<{ online: boolean; rtt: number | null }> {
  const url = `https://${domain}/favicon.ico?_=${Date.now()}`;
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    return { online: true, rtt: Math.round(performance.now() - start) };
  } catch {
    clearTimeout(timer);
    return { online: false, rtt: null };
  }
}
