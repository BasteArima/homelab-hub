import { createFileRoute } from "@tanstack/react-router";
import { readServices, writeServices, getAdminPassword } from "@/lib/services-data.server";
import { isAuthed, sessionSetCookie } from "@/lib/session.server";
import type { Service } from "@/lib/services-config";

function isValidService(s: unknown): s is Service {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    o.id.length < 100 &&
    typeof o.name === "string" &&
    o.name.length > 0 &&
    o.name.length < 200 &&
    typeof o.group === "string" &&
    o.group.length > 0 &&
    o.group.length < 100 &&
    typeof o.icon === "string" &&
    o.icon.length < 100 &&
    typeof o.localPort === "number" &&
    o.localPort >= 0 &&
    o.localPort <= 65535 &&
    typeof o.localPath === "string" &&
    o.localPath.length < 500 &&
    typeof o.domain === "string" &&
    o.domain.length < 500 &&
    typeof o.isVps === "boolean" &&
    (o.description === undefined ||
      (typeof o.description === "string" && o.description.length < 500)) &&
    (o.protocol === undefined || o.protocol === "http" || o.protocol === "https") &&
    (o.localProtocol === undefined || o.localProtocol === "http" || o.localProtocol === "https") &&
    (o.remoteProtocol === undefined ||
      o.remoteProtocol === "http" ||
      o.remoteProtocol === "https") &&
    (o.localHost === undefined || (typeof o.localHost === "string" && o.localHost.length < 253)) &&
    (o.remotePort === undefined ||
      (typeof o.remotePort === "number" && o.remotePort >= 0 && o.remotePort <= 65535)) &&
    (o.color === undefined || (typeof o.color === "string" && o.color.length < 32))
  );
}

export const Route = createFileRoute("/api/services")({
  server: {
    handlers: {
      GET: async () => {
        const services = await readServices();
        return Response.json(services, {
          headers: { "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body || typeof body !== "object") {
          return new Response("Invalid body", { status: 400 });
        }
        const { adminPassword, services, verify } = body as {
          adminPassword?: unknown;
          services?: unknown;
          verify?: unknown;
        };
        // Authorize by password (fresh login) or by an existing session cookie.
        const byPassword =
          typeof adminPassword === "string" && adminPassword === getAdminPassword();
        const byCookie = await isAuthed(request);
        if (!byPassword && !byCookie) {
          return new Response("Unauthorized", { status: 401 });
        }
        // Issue/refresh the session cookie whenever the password was verified.
        const cookieHeaders: HeadersInit = byPassword
          ? { "Set-Cookie": await sessionSetCookie() }
          : {};

        // Password-only check used to enter edit mode (no write).
        if (verify === true) {
          return Response.json({ ok: true }, { headers: cookieHeaders });
        }
        if (!Array.isArray(services) || services.length > 500) {
          return new Response("Invalid services payload", { status: 400 });
        }
        for (const s of services) {
          if (!isValidService(s)) {
            return new Response("Invalid service entry", { status: 400 });
          }
        }
        const ids = new Set<string>();
        for (const s of services) {
          if (ids.has(s.id)) return new Response(`Duplicate id: ${s.id}`, { status: 400 });
          ids.add(s.id);
        }
        await writeServices(services);
        return Response.json({ ok: true, count: services.length }, { headers: cookieHeaders });
      },
    },
  },
});
