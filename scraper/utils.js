// utils.js — a handful of small helpers used throughout the scraper

// "https://example.com/, extra" → "example.com": drops protocol, trailing slash and anything after a separator
export function normalizeDomain(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^https?:\/\//i, "").split(/[\s,;]/)[0].replace(/\/$/, "");
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

