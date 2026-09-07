import { createFileRoute } from "@tanstack/react-router";
import { readServices } from "@/lib/services-data.server";
import { checkAll } from "@/lib/ping.server";
import { isLocked } from "@/lib/private.server";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      /**
       * Health of every ping-enabled service, keyed by id.
       *
       * Targets are resolved from the stored config server-side and never taken
       * from the request: accepting a caller-supplied host would turn this into
       * an SSRF probe for the private network behind the dashboard.
       */
      GET: async ({ request }) => {
        if (await isLocked(request)) return Response.json({});
        const results = await checkAll(await readServices());
        return Response.json(results, {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
