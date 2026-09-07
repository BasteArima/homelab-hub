import net from "node:net";
import http from "node:http";
import https from "node:https";
import type { Service } from "./services-config";

export type PingResult = {
  online: boolean;
  /** TCP connect time in ms, or null when unreachable. */
  rtt: number | null;
  /** HTTP status when readable, else null (non-HTTP service, TLS error, timeout). */
  status: number | null;
};

/** Gateway codes that mean "the proxy is up but the service behind it is not". */
const DEAD_GATEWAY = new Set([502, 503, 504]);

/**
 * HTTP gets a longer budget than the TCP connect: a proxy fronting a dead
 * backend can sit on the request for several seconds before giving up.
 */
const HTTP_TIMEOUT_MS = 6000;

/**
 * Host the dashboard itself runs on, used by services that record an empty
 * localHost ("same machine as the hub"). Inside Docker `localhost` is the
 * container, not the LAN host, so this has to be configured explicitly via
 * LAN_HOST; host.docker.internal is the fallback (needs the host-gateway
 * extra_hosts entry on Linux).
 */
function selfHost(): string {
  return process.env.LAN_HOST?.trim() || "host.docker.internal";
}

type Target = { host: string; port: number; tls: boolean };

/** Direct LAN address: host:port, bypassing any reverse proxy. */
function localTarget(svc: Service): Target | null {
  if (!svc.localPort) return null;
  const proto = svc.localProtocol ?? svc.protocol ?? "http";
  return {
    host: svc.localHost?.trim() || selfHost(),
    port: svc.localPort,
    tls: proto === "https",
  };
}

/** Public address, via the domain (and therefore usually via the proxy). */
function remoteTarget(svc: Service): Target | null {
  if (!svc.domain) return null;
  const proto = svc.remoteProtocol ?? svc.protocol ?? "https";
  // Tolerate a stray path accidentally saved into the domain field.
  const host = svc.domain.split("/")[0].trim();
  if (!host) return null;
  return { host, port: svc.remotePort || (proto === "https" ? 443 : 80), tls: proto === "https" };
}

const sameTarget = (a: Target, b: Target) => a.host === b.host && a.port === b.port;

/** TCP connect. Resolves to the connect time in ms, or null if it never opened. */
function tcpCheck(host: string, port: number, timeoutMs: number): Promise<number | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const sock = new net.Socket();
    let done = false;
    const finish = (v: number | null) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => finish(Math.round(performance.now() - start)));
    sock.once("timeout", () => finish(null));
    sock.once("error", () => finish(null));
    sock.connect(port, host);
  });
}

/**
 * Reads the HTTP status. Certificate validation is off on purpose: homelab
 * services routinely use self-signed certs (Proxmox on 8006) and we only look
 * at the status line, never at the body.
 */
function httpCheck(
  host: string,
  port: number,
  tls: boolean,
  timeoutMs: number,
): Promise<number | null> {
  return new Promise((resolve) => {
    const mod = tls ? https : http;
    const req = mod.request(
      {
        host,
        port,
        path: "/",
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        // Don't follow redirects: a 301/302 already proves the service answered.
        headers: { "User-Agent": "homelab-hub/healthcheck" },
      },
      (res) => {
        resolve(res.statusCode ?? null);
        res.destroy();
      },
    );
    req.once("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.once("error", () => resolve(null));
    req.end();
  });
}

/**
 * Hybrid probe: TCP decides reachable/unreachable (works for every service,
 * including non-HTTP and self-signed TLS), then HTTP refines it so a proxy
 * answering 502 for a dead backend is reported as offline rather than online.
 */
async function probe(target: Target, timeoutMs: number): Promise<PingResult> {
  const rtt = await tcpCheck(target.host, target.port, timeoutMs);
  if (rtt === null) return { online: false, rtt: null, status: null };

  const status = await httpCheck(target.host, target.port, target.tls, HTTP_TIMEOUT_MS);
  // An open port is not enough: a proxy waiting on a dead backend accepts the
  // connection and then hangs or resets without ever answering. Every service
  // here is a web UI, so "reachable" means it actually produced a status line.
  return { online: status !== null && !DEAD_GATEWAY.has(status), rtt, status };
}

/**
 * Checks one service, preferring the direct LAN address so the result describes
 * the service itself rather than whatever answers for its domain.
 *
 * Falls back to the public address when that fails: a service recorded with a
 * blank local host ("same box as the hub") may actually live elsewhere, e.g. a
 * panel on a VPS. The fallback is safe because we read the status — a proxy
 * replying 502/503/504 for a dead backend still counts as offline.
 */
export async function checkService(svc: Service, timeoutMs = 3000): Promise<PingResult> {
  const local = localTarget(svc);
  const remote = remoteTarget(svc);
  const first = local ?? remote;
  if (!first) return { online: false, rtt: null, status: null };

  const result = await probe(first, timeoutMs);
  if (result.online || !remote || sameTarget(first, remote)) return result;

  return probe(remote, timeoutMs);
}

/** Checks every ping-enabled service, keyed by service id. */
export async function checkAll(services: Service[]): Promise<Record<string, PingResult>> {
  const targets = services.filter((s) => s.isVps);
  const entries = await Promise.all(
    targets.map(async (s) => [s.id, await checkService(s)] as const),
  );
  return Object.fromEntries(entries);
}
