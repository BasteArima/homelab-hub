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
};

export const servicesData: Service[] = [
  { id: "omv", name: "OpenMediaVault", group: "System", icon: "HardDrive", localPort: 9315, localPath: "/", domain: "omv.baste.ru", isVps: false, description: "NAS administration" },
  { id: "portainer", name: "Portainer", group: "System", icon: "Container", localPort: 9000, localPath: "/", domain: "portainer.baste.ru", isVps: false, description: "Docker management" },
  { id: "proxmox", name: "Proxmox", group: "System", icon: "Server", localPort: 8006, localPath: "/", domain: "pve.baste.ru", isVps: false, description: "Virtualization" },
  { id: "uptime", name: "Uptime Kuma", group: "System", icon: "Activity", localPort: 3001, localPath: "/", domain: "status.baste.ru", isVps: false, description: "Service monitoring" },

  { id: "jellyfin", name: "Jellyfin", group: "Media", icon: "Film", localPort: 8096, localPath: "/", domain: "jellyfin.baste.ru", isVps: false, description: "Media streaming" },
  { id: "plex", name: "Plex", group: "Media", icon: "PlayCircle", localPort: 32400, localPath: "/web", domain: "plex.baste.ru", isVps: false, description: "Media server" },
  { id: "navidrome", name: "Navidrome", group: "Media", icon: "Music", localPort: 4533, localPath: "/", domain: "music.baste.ru", isVps: false, description: "Music streaming" },
  { id: "immich", name: "Immich", group: "Media", icon: "Image", localPort: 2283, localPath: "/", domain: "photos.baste.ru", isVps: false, description: "Photo backup" },

  { id: "qbit", name: "qBittorrent", group: "Downloads", icon: "Download", localPort: 8080, localPath: "/", domain: "qbit.baste.ru", isVps: false, description: "Torrent client" },
  { id: "sonarr", name: "Sonarr", group: "Downloads", icon: "Tv", localPort: 8989, localPath: "/", domain: "sonarr.baste.ru", isVps: false, description: "TV automation" },
  { id: "radarr", name: "Radarr", group: "Downloads", icon: "Clapperboard", localPort: 7878, localPath: "/", domain: "radarr.baste.ru", isVps: false, description: "Movie automation" },
  { id: "prowlarr", name: "Prowlarr", group: "Downloads", icon: "Search", localPort: 9696, localPath: "/", domain: "prowlarr.baste.ru", isVps: false, description: "Indexer manager" },

  { id: "vaultwarden", name: "Vaultwarden", group: "VPS", icon: "KeyRound", localPort: 8222, localPath: "/", domain: "vault.baste.ru", isVps: true, description: "Password vault" },
  { id: "nextcloud", name: "Nextcloud", group: "VPS", icon: "Cloud", localPort: 8081, localPath: "/", domain: "cloud.baste.ru", isVps: true, description: "File sync" },
  { id: "ghost", name: "Ghost Blog", group: "VPS", icon: "Newspaper", localPort: 2368, localPath: "/", domain: "blog.baste.ru", isVps: true, description: "Personal blog" },
];

export function resolveServiceUrl(svc: Service): string {
  if (typeof window === "undefined") return `https://${svc.domain}${svc.localPath}`;
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  if (isLocal) return `http://${host}:${svc.localPort}${svc.localPath}`;
  return `https://${svc.domain}${svc.localPath}`;
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