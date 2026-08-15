import { isLocalHost } from "./services-config";
import { isAuthed } from "./session.server";

/** PRIVATE_MODE hides everything behind a password for external visitors. */
export function isPrivateMode(): boolean {
  const v = (process.env.PRIVATE_MODE || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** External = the request arrived on the public domain, not a LAN host. */
export function isExternalRequest(request: Request): boolean {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].trim();
  return hostname ? !isLocalHost(hostname) : false;
}

/** True when the site must stay hidden behind the password gate for this request. */
export async function isLocked(request: Request): Promise<boolean> {
  if (!isPrivateMode()) return false;
  if (!isExternalRequest(request)) return false;
  return !(await isAuthed(request));
}
