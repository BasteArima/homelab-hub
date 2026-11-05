/**
 * Production Node.js server for Homelab Hub.
 * Serves static assets from dist/client/ and falls back to SSR via the
 * Cloudflare Worker-compatible build in dist/server/.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate the SSR bundle. The filename follows the TanStack Start entry name,
 * which vite.config.ts overrides to "server" — so don't hard-code one name.
 */
function resolveServerEntry() {
  const dir = path.join(__dirname, "dist/server");
  for (const name of ["server.js", "index.js"]) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No SSR entry (server.js / index.js) found in ${dir} — did the build run?`);
}

// pathToFileURL: a bare absolute path is not a valid ESM specifier on Windows.
const serverMod = await import(pathToFileURL(resolveServerEntry()).href);
const handler = serverMod.default;

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIR = path.join(__dirname, "dist/client");

/** Keep in sync with PEER_HEADER in src/lib/private.server.ts. */
const PEER_HEADER = "x-peer-ip";

const MIME_TYPES = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".webp": "image/webp",
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;

  // 1. Serve static files from dist/client/ (CSS, JS, images, etc.)
  const filePath = path.join(CLIENT_DIR, urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.setHeader("Content-Type", getMimeType(filePath));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 2. Fall back to SSR for all other routes
  try {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      // The host travels in the request URL below instead.
      if (key === "host") continue;
      // Internal header: a client must never be able to supply its own peer
      // address, or PRIVATE_MODE could be unlocked from the public internet.
      if (key === PEER_HEADER) continue;
      if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
      else if (v) headers.set(k, v);
    }
    // The real TCP peer, which cannot be forged by the client.
    headers.set(PEER_HEADER, req.socket.remoteAddress || "");

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? Readable.toWeb(req)
          : undefined,
      duplex: "half",
    });

    const response = await handler.fetch(request, {}, {});

    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    for (const [k, v] of response.headers) {
      if (k === "content-encoding") continue; // avoid double compression
      res.setHeader(k, v);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error("SSR error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Homelab Hub server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    process.exit(1);
  });
});
