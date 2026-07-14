export type Protocol = "http" | "https";

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
  /**
   * @deprecated Legacy single protocol applied to both contexts. Kept only as a
   * fallback for older configs. New entries use localProtocol / remoteProtocol.
   */
  protocol?: Protocol;
  /** Protocol used for LOCAL access (direct IP:port). Defaults to "http". */
  localProtocol?: Protocol;
  /** Protocol used for REMOTE access (via domain / reverse proxy). Defaults to "https". */
  remoteProtocol?: Protocol;
  /** Optional fixed LAN host/IP for services that run on a different machine than this dashboard. When set, local access uses this host instead of window.location.hostname. */
  localHost?: string;
  /** Optional port for REMOTE access. Usually empty when a reverse proxy fronts the domain on 80/443. */
  remotePort?: number;
};

/** True when the given hostname is on a private/LAN network (or loopback). */
export function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

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

function remoteUrl(svc: Service): string {
  const protocol = svc.remoteProtocol ?? svc.protocol ?? "https";
  const path = svc.localPath || "/";
  const port = svc.remotePort ? `:${svc.remotePort}` : "";
  return `${protocol}://${svc.domain}${port}${path}`;
}

/** Verifies the admin password server-side without writing anything. */
export async function verifyPassword(adminPassword: string): Promise<boolean> {
  const res = await fetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword, verify: true }),
  });
  return res.ok;
}

export function resolveServiceUrl(svc: Service): string {
  // SSR / non-browser: assume remote access.
  if (typeof window === "undefined") return remoteUrl(svc);

  const host = window.location.hostname;
  if (!isLocalHost(host)) return remoteUrl(svc);

  // Local access: go straight to the LAN host:port.
  const protocol = svc.localProtocol ?? svc.protocol ?? "http";
  const path = svc.localPath || "/";
  const localHost = svc.localHost && svc.localHost.trim() ? svc.localHost.trim() : host;
  const port = svc.localPort ? `:${svc.localPort}` : "";
  return `${protocol}://${localHost}${port}${path}`;
}

/**
 * Both resolved URLs for editor previews. Uses placeholders where a value is
 * blank so the user can see the shape before filling everything in.
 */
export function previewUrls(svc: Service): { local: string; remote: string } {
  const path = svc.localPath || "/";
  const lProto = svc.localProtocol ?? svc.protocol ?? "http";
  const lHost = svc.localHost && svc.localHost.trim() ? svc.localHost.trim() : "<this-host>";
  const lPort = svc.localPort ? `:${svc.localPort}` : "";
  const rProto = svc.remoteProtocol ?? svc.protocol ?? "https";
  const rPort = svc.remotePort ? `:${svc.remotePort}` : "";
  return {
    local: `${lProto}://${lHost}${lPort}${path}`,
    remote: `${rProto}://${svc.domain || "<domain>"}${rPort}${path}`,
  };
}

export async function pingService(
  domain: string,
  timeoutMs = 5000,
): Promise<{ online: boolean; rtt: number | null }> {
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
