// utils.js — a handful of small helpers used throughout the scraper

// breaks a big array into smaller chunks so we don't hammer too many sites at once
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// gives a promise a hard deadline — if it takes too long, we move on
export function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timer]);
}

// turns a bare domain like "example.com" into a proper URL
export function toUrl(domain, protocol = "https") {
  domain = domain.trim().replace(/^https?:\/\//i, "");
  return `${protocol}://${domain}`;
}

// removes duplicate detections — same tech can match from multiple spots on a page
export function dedupe(techs) {
  const seen = new Set();
  return techs.filter(({ name, proof }) => {
    const key = `${name}|${proof}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

