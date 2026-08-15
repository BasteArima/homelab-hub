import { createFileRoute } from "@tanstack/react-router";
import { isAuthed, sessionClearCookie } from "@/lib/session.server";

export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      // Is the current browser signed in?
      GET: async ({ request }) => Response.json({ authed: await isAuthed(request) }),
      // Sign out: clear the session cookie.
      POST: async () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": sessionClearCookie() } }),
    },
  },
});
