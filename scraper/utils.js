// utils.js — a handful of small helpers used throughout the scraper

// breaks a big array into smaller chunks so we don't hammer too many sites at once
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// turns a bare domain like "example.com" into a proper URL
export function toUrl(domain, protocol = "https") {
  domain = domain.trim().replace(/^https?:\/\//i, "");
  return `${protocol}://${domain}`;
}

// keeps one detection per technology — several rules can match the same tech
export function dedupe(techs) {
  const seen = new Set();
  return techs.filter(({ name }) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

