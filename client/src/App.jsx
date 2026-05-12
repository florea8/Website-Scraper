import { useRef, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_SCRAPER_API_URL || "http://localhost:3001";
const CONCURRENCY = 8;

function parseDomains(text) {
  return [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((line) =>
          line
            .trim()
            .split(/[\s,;]/)[0]
            .replace(/^https?:\/\//i, "")
            .replace(/\/$/, "")
            .trim()
        )
        .filter(Boolean)
    ),
  ];
}

async function scanWithConcurrency(domains, concurrency, onResult) {
  let index = 0;

  async function worker() {
    while (index < domains.length) {
      const current = index++;
      const domain = domains[current];
      const start = Date.now();
      try {
        const response = await fetch(`${API_BASE}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        const payload = await response.json();
        onResult(current, { ...payload, domain, durationMs: Date.now() - start });
      } catch (err) {
        onResult(current, {
          domain,
          success: false,
          technologies: [],
          error: err.message,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, domains.length) }, worker)
  );
}

export default function App() {
  const [domains, setDomains] = useState([]);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  const totalTechs = results.reduce(
    (sum, r) => sum + (r?.technologies?.length || 0),
    0
  );

  function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseDomains(e.target.result);
      setDomains(parsed);
      setResults([]);
      setCompleted(0);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function onScan() {
    if (!domains.length || isScanning) return;
    setIsScanning(true);
    setResults(new Array(domains.length).fill(null));
    setCompleted(0);

    await scanWithConcurrency(domains, CONCURRENCY, (index, result) => {
      setResults((prev) => {
        const next = [...prev];
        next[index] = result;
        return next;
      });
      setCompleted((c) => c + 1);
    });

    setIsScanning(false);
  }

  const progress = domains.length
    ? Math.round((completed / domains.length) * 100)
    : 0;

  const successCount = results.filter((r) => r?.success).length;
  const failCount = results.filter((r) => r && !r.success).length;

  return (
    <main className="page">
      <section className="panel">
        <h1>Website Technologies Scanner</h1>
        <p className="subtitle">
          Upload a CSV or TXT file with one domain per line.
        </p>

        <div className="upload-row">
          <button
            className="btn btn--secondary"
            onClick={() => fileInputRef.current.click()}
            disabled={isScanning}
          >
            Choose file
          </button>
          <span className="file-name">{fileName || "No file selected"}</span>
          {domains.length > 0 && (
            <span className="tag">{domains.length} domains loaded</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>

        <button
          className="btn btn--primary"
          disabled={!domains.length || isScanning}
          onClick={onScan}
        >
          {isScanning
            ? `Scanning... (${completed} / ${domains.length})`
            : "Scan All Domains"}
        </button>

        {(isScanning || completed > 0) && (
          <div className="progress-wrapper">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">{progress}%</span>
          </div>
        )}

        {completed > 0 && (
          <div className="summary">
            <div className="summary-item">
              <span className="summary-value">{completed}</span>
              <span className="summary-label">Scanned</span>
            </div>
            <div className="summary-item">
              <span className="summary-value summary-value--ok">{successCount}</span>
              <span className="summary-label">Successful</span>
            </div>
            <div className="summary-item">
              <span className="summary-value summary-value--fail">{failCount}</span>
              <span className="summary-label">Failed</span>
            </div>
            <div className="summary-item">
              <span className="summary-value summary-value--tech">{totalTechs}</span>
              <span className="summary-label">Total technologies</span>
            </div>
          </div>
        )}

        {results.some(Boolean) && (
          <div className="results-list">
            {results.map((result, i) =>
              result ? (
                <div
                  key={i}
                  className={`result-row${
                    result.success ? "" : " result-row--fail"
                  }`}
                >
                  <div className="result-header">
                    <span className="result-domain">{result.domain}</span>
                    <span className="result-badge">
                      {result.technologies.length} techs
                    </span>
                    <span className="result-duration">{result.durationMs}ms</span>
                  </div>
                  {result.error && (
                    <p className="result-error">{result.error}</p>
                  )}
                  {result.technologies.length > 0 && (
                    <ul className="tech-list">
                      {result.technologies.map((tech) => (
                        <li key={tech.name}>
                          <strong>{tech.name}</strong>
                          {tech.proof && (
                            <span className="tech-proof">{tech.proof}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div key={i} className="result-row result-row--pending">
                  <span className="result-domain">{domains[i]}</span>
                  <span className="result-badge">pending</span>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

