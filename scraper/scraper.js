
import https from "https";
import http from "http";
import { withTimeout, toUrl, dedupe } from "./utils.js";
import fingerprints from "./signatures.js";

const DEFAULT_TIMEOUT_MS = 8000;

// fetch
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TechDetector/1.0)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        rejectUnauthorized: false, // some small sites use self-signed certs
      },
      (res) => {
        // follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
          res.resume();
          let next = res.headers.location;
          if (!/^https?:\/\//i.test(next)) {
            const base = new URL(url);
            next = `${base.protocol}//${base.host}${next}`;
          }
          resolve(fetchUrl(next, maxRedirects - 1));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf-8") })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// tries https first, falls back to http if that fails
async function fetchWithFallback(domain, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let lastErr;
  for (const protocol of ["https", "http"]) {
    try {
      return await withTimeout(fetchUrl(toUrl(domain, protocol)), timeoutMs);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// html extraction
// pulls out all meta tag strings
function extractMeta(html) {
  return (html.match(/<meta[^>]+>/gi) || []).join(" ");
}

// collects src values from <script src="..."> and href values from <link href="..."> only
function extractScripts(html) {
  const srcs = [];
  const scriptRe = /<script[^>]+\bsrc=["']([^"']+)["'][^>]*>/gi;
  const linkRe = /<link[^>]+\bhref=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) srcs.push(m[1]);
  while ((m = linkRe.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

// grabs the text inside inline <script> blocks (not external ones)
function extractInlineJs(html) {
  const blocks = [];
  const re = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks.join("\n");
}

// collects all CSS class names
function extractCssClasses(html) {
  const classes = [];
  const re = /class=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) classes.push(...m[1].split(/\s+/));
  return classes.join(" ");
}

// parses Set-Cookie headers into a { name: value } map
function extractCookies(headers) {
  const cookies = {};
  for (const raw of headers["set-cookie"] || []) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return cookies;
}

// detection
function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function getSnippet(text, pattern) {
  const m = pattern.exec(text);
  if (!m) return "";
  const start = Math.max(0, m.index - 20);
  const end = Math.min(text.length, m.index + m[0].length + 20);
  return truncate(text.slice(start, end).replace(/\s+/g, " ").trim(), 120);
}

function detect(buckets) {
  const results = [];
  for (const fp of fingerprints) {
    let matched = false;
    let proof = "";
    switch (fp.location) {
      case "html":
        if (fp.pattern.test(buckets.html)) {
          proof = `html contains "${getSnippet(buckets.html, fp.pattern)}"`;
          matched = true;
        }
        break;
      case "meta":
        if (fp.pattern.test(buckets.meta)) {
          proof = `meta tag contains "${getSnippet(buckets.meta, fp.pattern)}"`;
          matched = true;
        }
        break;
      case "scripts":
        for (const src of buckets.scripts) {
          if (fp.pattern.test(src)) {
            proof = `script src = "${truncate(src, 120)}"`;
            matched = true;
            break;
          }
        }
        break;
      case "inline_js":
        if (fp.pattern.test(buckets.inlineJs)) {
          proof = `inline JS contains "${getSnippet(buckets.inlineJs, fp.pattern)}"`;
          matched = true;
        }
        break;
      case "css_classes":
        if (fp.pattern.test(buckets.cssClasses)) {
          proof = `CSS class "${getSnippet(buckets.cssClasses, fp.pattern)}"`;
          matched = true;
        }
        break;
      case "header": {
        const val = buckets.headers[fp.header];
        if (val && fp.pattern.test(val)) {
          proof = `header ${fp.header}: "${val}"`;
          matched = true;
        }
        break;
      }
      case "cookies":
        for (const [name, value] of Object.entries(buckets.cookies)) {
          if (fp.pattern.test(name)) {
            proof = `cookie "${name}=${truncate(value, 60)}"`;
            matched = true;
            break;
          }
        }
        break;
    }
    if (matched) results.push({ name: fp.name, proof });
  }
  return results;
}

// public API
export async function scrapeDomain(domain, options = {}) {
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  let response;
  try {
    response = await fetchWithFallback(domain, timeoutMs);
  } catch (err) {
    return { error: err.message };
  }
  const { headers, body: html } = response;
  const buckets = {
    html,
    meta: extractMeta(html),
    scripts: extractScripts(html),
    inlineJs: extractInlineJs(html),
    cssClasses: extractCssClasses(html),
    headers,
    cookies: extractCookies(headers),
  };
  return { technologies: dedupe(detect(buckets)) };

}