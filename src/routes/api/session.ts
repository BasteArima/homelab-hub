import { createFileRoute } from "@tanstack/react-router";
import { isAuthed, sessionClearCookie } from "@/lib/session.server";
import { isLocked } from "@/lib/private.server";

export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      // Auth + private-mode lock state for the current request.
      GET: async ({ request }) =>
        Response.json({ authed: await isAuthed(request), locked: await isLocked(request) }),
      // Sign out: clear the session cookie.
      POST: async () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": sessionClearCookie() } }),
    },
  },
});
