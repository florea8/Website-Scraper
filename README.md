# Tech Detector

A Node.js tool that identifies technologies used on websites by analysing the raw HTTP response — no headless browser required. Given a list of domains, it detects CMS platforms, JS frameworks, analytics tools, payment providers, CDN infrastructure and more, each with a concrete evidence snippet explaining *why* the detection was made.

---

## How it works

```
domain → HTTP fetch (https with http fallback) → extract buckets → match signatures → result
```

Each HTTP response is split into **buckets**:

| Bucket | What it contains |
|---|---|
| `html` | Full raw HTML body |
| `meta` | All `<meta>` tag strings |
| `scripts` | `src` values from `<script>` and `href` from `<link>` only |
| `inline_js` | Content of inline `<script>` blocks |
| `css_classes` | All `class="..."` attribute values |
| `headers` | HTTP response headers |
| `cookies` | Parsed `Set-Cookie` names |

Each signature in `signatures.js` targets exactly one bucket with a regex. When it matches, the result includes an **evidence** string showing the exact snippet that triggered the detection.

### Why HTTP parsing and not Puppeteer

HTTP parsing (fetch + regex) is orders of magnitude faster than launching a headless browser. For 200 domains with concurrency 8, a full scan completes in under 2 minutes. Puppeteer would take 10–20× longer and consume significantly more memory and CPU.

The trade-off is that technologies injected only *after* JavaScript executes (e.g. `window.Shopify` global, dynamic chat widgets) may be missed. For the scope of this task — detecting technologies from static HTML responses — HTTP parsing provides the best balance of speed, accuracy and simplicity.

---

## Project structure

```
Website-Scraper/
├── scraper/
│   ├── index.js        # CLI batch runner — reads domains, writes results.csv
│   ├── server.js       # HTTP API server — POST /scan for single domain
│   ├── scraper.js      # Core: fetch, extract buckets, run detection
│   ├── signatures.js   # ~120 technology fingerprints
│   ├── utils.js        # chunk, withTimeout, toUrl, dedupe
│   ├── domains.csv     # Input file with domains to scan
│   ├── results.csv     # Output file with scan results
│   └── package.json    # Node.js dependencies and scripts
└── client/
    ├── index.html      # HTML entry point
    ├── vite.config.js  # Vite bundler configuration
    ├── eslint.config.js
    ├── package.json    # Frontend dependencies and scripts
    └── src/
        ├── main.jsx    # React entry point
        ├── App.jsx     # React UI — file upload, batch scan, live results
        ├── App.css
        └── index.css
```

---

## Running the project

### 1. CLI batch scan

Reads all domains from a file and writes `results.csv`.

```bash
cd scraper
node index.js
```

Options:

```bash
node index.js --input domains.csv --csv results.csv --concurrency 10 --timeout 12000
```

| Flag | Default | Description |
|---|---|---|
| `--input` | `domains.csv` | Input file (one domain per line) |
| `--csv` | `results.csv` | Output CSV path |
| `--concurrency` | `8` | Parallel requests |
| `--timeout` | `15000` | Per-domain timeout in ms |

### 2. API server

```bash
cd scraper
npm run start:api
# → http://localhost:3001
```

**POST /scan**

```bash
curl -X POST http://localhost:3001/scan \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

Response:

```json
{
  "domain": "example.com",
  "success": true,
  "technologies": [
    { "name": "Nginx", "proof": "header server: \"nginx\"" },
    { "name": "Google Analytics", "proof": "inline JS contains \"gtag('config'...\"" }
  ],
  "durationMs": 843
}
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Upload a `.csv` or `.txt` file with one domain per line. The UI scans all domains concurrently and shows live progress, per-domain results with evidence, and a summary with the total number of technologies detected.

---

## Output format (CSV)

```
domain,technologies_count,technologies,error
example.com,3,Nginx|Google Analytics|Bootstrap,
broken-domain.xyz,0,,Timed out after 15000ms
```

---

## Debate topics

### 1. Main issues with the current implementation and how to tackle them

**JavaScript-rendered content is invisible.**
Technologies injected after JS execution (e.g. dynamic chat widgets, `window.Shopify`) are not detected. 
**Signature coverage is finite.**
The fingerprint list requires manual maintenance. Any technology not explicitly defined will be missed.
**`rejectUnauthorized: false`.**
Disabled TLS verification is needed to reach self-signed certificates on small sites, but it reduces security. 

---

### 2. Scaling to millions of domains in 1–2 months

**Queue-based worker pool.**
Push all domains into a message queue (Redis + BullMQ or RabbitMQ). Deploy N worker containers (Docker/Kubernetes), each pulling batches of domains, scanning them and writing results to a shared database (Postgres or ClickHouse). With 20 workers each at concurrency 20, throughput reaches ~200k domains/hour → ~140M domains/month. Kubernetes autoscaling adjusts the worker count based on queue depth.

**Rotating proxies.**
At scale, domains start rate-limiting or blocking the scraper IP. A pool of rotating residential proxies distributes the outbound traffic and avoids bans.

---

### 3. Discovering new technologies automatically

**Cluster unknown scripts.**
Collect all `<script src>` and `<link href>` values across the entire domain corpus. Group them by hostname and path pattern. URLs that appear on hundreds of domains but are not matched by any existing signature are strong candidates for new fingerprints.

**Leverage open-source fingerprint databases.**
The Wappalyzer fingerprint database is open source. Periodically syncing new entries from it provides automated coverage of newly documented technologies without manual work.
