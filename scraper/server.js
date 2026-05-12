import http from "http";
import { scrapeDomain } from "./scraper.js";

const PORT = Number(process.env.PORT || 3001);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.REQUEST_TIMEOUT_MS || 15000));

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function normalizeDomain(input) {
  if (!input || typeof input !== "string") return "";
  return input.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8").trim();
        if (!raw) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", () => reject(new Error("Failed to read request body")));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/scan") {
    try {
      const body = await readJsonBody(req);
      const domain = normalizeDomain(body.domain);
      if (!domain) {
        sendJson(res, 400, { error: "Field 'domain' is required" });
        return;
      }

      const startedAt = Date.now();
      const result = await scrapeDomain(domain, { timeoutMs: REQUEST_TIMEOUT_MS });

      sendJson(res, 200, {
        domain,
        success: !result.error,
        technologies: result.technologies || [],
        error: result.error || null,
        durationMs: Date.now() - startedAt,
      });
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Request failed" });
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Scraper API running on http://localhost:${PORT}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
});
