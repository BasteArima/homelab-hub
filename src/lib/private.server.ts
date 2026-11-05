import { isLocalHost } from "./services-config";
import { isAuthed } from "./session.server";

/**
 * Header that the production server (docker-server.mjs) fills with the real
 * TCP peer address. It strips any copy sent by the client, so this value
 * cannot be forged from outside.
 */
export const PEER_HEADER = "x-peer-ip";

/** PRIVATE_MODE hides everything behind a password for external visitors. */
export function isPrivateMode(): boolean {
  const v = (process.env.PRIVATE_MODE || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** Drops brackets, the IPv4-mapped IPv6 prefix and any zone id. */
function normalizeAddr(value: string): string {
  let a = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (a.toLowerCase().startsWith("::ffff:")) a = a.slice(7);
  const zone = a.indexOf("%");
  if (zone !== -1) a = a.slice(0, zone);
  return a;
}

/** Loopback or RFC1918 address, or the literal name "localhost". */
function isLanAddress(value: string): boolean {
  const a = normalizeAddr(value);
  if (!a) return false;
  return a === "::1" || /^127\./.test(a) || isLocalHost(a);
}

/**
 * Hostname the request was addressed to. The production server drops the Host
 * header when it builds the SSR Request and puts the host in the URL instead,
 * so read the URL first and fall back to the header (dev server).
 */
function requestHostname(request: Request): string {
  try {
    const fromUrl = new URL(request.url).hostname;
    if (fromUrl) return normalizeAddr(fromUrl);
  } catch {
    /* fall through to the header */
  }
  return normalizeAddr((request.headers.get("host") || "").split(":")[0]);
}

/**
 * External = anything that is not a direct visit from the local network.
 *
 * Layered on purpose. The Host header is chosen by the client, so on its own it
 * would let an outsider unlock the dashboard by sending `Host: 192.168.0.1`:
 *  - a non-private TCP peer is the public internet, whatever the Host claims;
 *  - an X-Forwarded-* header means the request came through the reverse proxy,
 *    so the private peer is only the proxy and the visitor is outside;
 *  - otherwise fall back to the Host, which still separates a LAN IP from a
 *    public domain for direct hits.
 *
 * Anything unknown or unparseable counts as external: the gate fails closed.
 */
export function isExternalRequest(request: Request): boolean {
  const peer = request.headers.get(PEER_HEADER);
  if (peer && !isLanAddress(peer)) return true;

  if (request.headers.get("x-forwarded-for") || request.headers.get("x-forwarded-host")) {
    return true;
  }

  const hostname = requestHostname(request);
  if (!hostname) return true;
  return !isLanAddress(hostname);
}

/** True when the site must stay hidden behind the password gate for this request. */
export async function isLocked(request: Request): Promise<boolean> {
  if (!isPrivateMode()) return false;
  if (!isExternalRequest(request)) return false;
  return !(await isAuthed(request));
}
