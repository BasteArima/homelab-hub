import { getAdminPassword } from "./services-data.server";

const COOKIE = "hub_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Opaque token derived from the current admin password (changes invalidate old sessions). */
export async function sessionToken(): Promise<string> {
  return sha256Hex(`homelab-hub:v1:${getAdminPassword()}`);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the request carries a valid session cookie. */
export async function isAuthed(request: Request): Promise<boolean> {
  const token = readCookie(request, COOKIE);
  if (!token) return false;
  return timingSafeEqual(token, await sessionToken());
}

export async function sessionSetCookie(): Promise<string> {
  return `${COOKIE}=${await sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function sessionClearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
