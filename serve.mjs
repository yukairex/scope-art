// Serves index.html on the tailscale IP only (never 0.0.0.0 — this box has a public IP and
// no firewall). Plain HTTP on PORT for presets/files; HTTPS on HTTPS_PORT with a self-signed
// cert (certs/) because browsers only grant microphone access + AudioWorklet to HTTPS pages.
import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";

const HOST = process.env.HOST || "100.110.5.32";
const PORT = +(process.env.PORT || 3017);
const HTTPS_PORT = +(process.env.HTTPS_PORT || 3018);
const ROOT = new URL("./", import.meta.url);
const CERT = new URL("./certs/cert.pem", import.meta.url), KEY = new URL("./certs/key.pem", import.meta.url);
// Only the app's own files are served — never certs/ or anything else in this folder.
const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
  "/sw.js": ["sw.js", "text/javascript; charset=utf-8"],
  "/icons/apple-touch-icon.png": ["icons/apple-touch-icon.png", "image/png"],
  "/icons/icon-192.png": ["icons/icon-192.png", "image/png"],
  "/icons/icon-512.png": ["icons/icon-512.png", "image/png"],
  "/icons/icon-maskable-512.png": ["icons/icon-maskable-512.png", "image/png"],
};

async function handler(req, res) {
  let path = "";
  try { path = new URL(req.url, "http://x").pathname; } catch {} // odd request lines must not crash the server
  const entry = FILES[path];
  if (!entry) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("not found");
  }
  try {
    const body = await readFile(new URL(entry[0], ROOT));
    res.writeHead(200, { "content-type": entry[1], "cache-control": "no-cache" });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(entry[0] + " unreadable: " + e.message);
  }
}

http.createServer(handler).listen(PORT, HOST, () => console.log(`scope art on http://${HOST}:${PORT}`));
if (existsSync(CERT) && existsSync(KEY)) {
  https.createServer({ cert: readFileSync(CERT), key: readFileSync(KEY) }, handler)
    .listen(HTTPS_PORT, HOST, () => console.log(`scope art on https://${HOST}:${HTTPS_PORT}`));
}
