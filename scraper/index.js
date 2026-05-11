import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeDomain } from "./scraper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
	const defaults = {
		input: "domains.csv",
		csv: "results.csv",
		concurrency: 8,
		timeoutMs: 15000,
	};

	const args = { ...defaults };
	for (let i = 2; i < argv.length; i += 1) {
		const current = argv[i];
		const next = argv[i + 1];

		if (current === "--input" && next) {
			args.input = next;
			i += 1;
			continue;
		}
		if (current === "--csv" && next) {
			args.csv = next;
			i += 1;
			continue;
		}
		if (current === "--concurrency" && next) {
			args.concurrency = Math.max(1, Number(next) || defaults.concurrency);
			i += 1;
			continue;
		}
		if (current === "--timeout" && next) {
			args.timeoutMs = Math.max(1000, Number(next) || defaults.timeoutMs);
			i += 1;
			continue;
		}
	}

	return args;
}

function normalizeDomain(value) {
	if (!value) return "";
	const cleaned = value.trim();
	if (!cleaned) return "";

	// Remove protocol and anything after first separator.
	return cleaned
		.replace(/^https?:\/\//i, "")
		.split(/[\s,;]/)[0]
		.replace(/\/$/, "")
		.trim();
}

async function loadDomains(filePath) {
	const raw = await fs.readFile(filePath, "utf-8");
	const lines = raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"))
		.map((line) => normalizeDomain(line))
		.filter(Boolean);

	return [...new Set(lines)];
}

function toCsvCell(value) {
	if (value === null || value === undefined) return "";
	const stringValue = String(value);
	if (/[",\n]/.test(stringValue)) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}
	return stringValue;
}

function formatTechnologies(technologies) {
	if (!Array.isArray(technologies) || technologies.length === 0) return "";
	return technologies.map((t) => t.name).join("|");
}

function createCsv(results) {
	const header = ["domain", "technologies_count", "technologies", "error"].join(",");
	const rows = results.map((result) => {
		const techCount = result.technologies.length;
		return [
			result.domain,
			techCount,
			formatTechnologies(result.technologies),
			result.error || "",
		]
			.map(toCsvCell)
			.join(",");
	});

	return [header, ...rows].join("\n");
}

function printSummary(results, elapsedMs) {
	let totalDetectedTechnologies = 0;

	for (const result of results) {
		for (const technology of result.technologies) {
			totalDetectedTechnologies += 1;
		}
	}

	const summary = {
		scannedDomains: results.length,
		successfulScans: results.filter((x) => x.success).length,
		failedScans: results.filter((x) => !x.success).length,
		totalDetectedTechnologies,
		elapsedMs,
	};

	console.log("\nScan complete.");
	console.log(JSON.stringify(summary, null, 2));
}

async function scrapeAll(domains, concurrency, timeoutMs) {
	const results = [];
	let completed = 0;
	const total = domains.length;

	async function worker(startIndex) {
		for (let i = startIndex; i < total; i += concurrency) {
			const domain = domains[i];
			const start = Date.now();
			const result = await scrapeDomain(domain, { timeoutMs });
			const durationMs = Date.now() - start;
			const success = !result.error;

			results[i] = {
				domain,
				success,
				technologies: result.technologies || [],
				error: result.error || null,
				durationMs,
			};

			completed += 1;
			const marker = success ? "ok" : "fail";
			console.log(
				`[${completed}/${total}] ${marker} ${domain} -> ${results[i].technologies.length} technologies (${durationMs}ms)`
			);
		}
	}

	const workers = [];
	const workersCount = Math.max(1, Math.min(concurrency, total));
	for (let i = 0; i < workersCount; i += 1) {
		workers.push(worker(i));
	}

	await Promise.all(workers);
	return results;
}

async function main() {
	try {
		const args = parseArgs(process.argv);
		const inputPath = path.isAbsolute(args.input) ? args.input : path.join(__dirname, args.input);
		const csvPath = path.isAbsolute(args.csv) ? args.csv : path.join(__dirname, args.csv);

		console.log("Loading domains...");
		const domains = await loadDomains(inputPath);
		if (domains.length === 0) {
			console.error(`No domains found in ${inputPath}`);
			process.exitCode = 1;
			return;
		}

		console.log(`Loaded ${domains.length} domains.`);
		console.log(`Using concurrency=${args.concurrency}`);
		console.log(`Timeout=${args.timeoutMs}ms`);

		const startedAt = Date.now();
		const results = await scrapeAll(domains, args.concurrency, args.timeoutMs);
		const elapsedMs = Date.now() - startedAt;

		await fs.mkdir(path.dirname(csvPath), { recursive: true });
		await fs.writeFile(csvPath, createCsv(results), "utf-8");

		console.log(`\nCSV: ${csvPath}`);
		printSummary(results, elapsedMs);
	} catch (error) {
		console.error("Fatal error:", error?.message || error);
		process.exitCode = 1;
	}
}

main();

