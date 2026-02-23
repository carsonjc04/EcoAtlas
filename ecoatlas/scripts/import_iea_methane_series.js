/**
 * IEA Methane Tracker data importer.
 *
 * Reads a locally downloaded IEA Methane Tracker CSV and extracts Russian
 * energy-sector methane emissions for the West Siberia hotspot (hs-012).
 *
 * This runs outside the main ingest pipeline because the IEA data requires
 * manual download (no public API) and needs custom CSV parsing to handle
 * the IEA export format (quoted fields, comma-separated thousands).
 *
 * Prerequisites:
 *   1. Download the IEA Methane Tracker CSV from https://www.iea.org/reports/methane-tracker
 *   2. Save it to data/raw/iea_methane_series.csv
 *
 * Run: node scripts/import_iea_methane_series.js
 * Output: data/series/siberian_methane_leakage_mt_annual.json
 *
 * The output is referenced by sourceMap entries for hs-010, hs-012 that
 * list "src-iea-methane" as a source.
 */

const fs = require("fs");
const path = require("path");

const INPUT_PATH = path.join(
  __dirname,
  "..",
  "data",
  "raw",
  "iea_methane_series.csv"
);
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "data",
  "series",
  "siberian_methane_leakage_mt_annual.json"
);

/**
 * Handles RFC 4180 CSV edge cases: doubled quotes for escaping,
 * commas inside quoted fields. The IEA export uses both.
 */
const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
};

/** Strips thousands-separator commas and parses to number, or null if invalid. */
const parseNumber = (value) => {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Extracts the first 4-digit year from a string like "FY2019" or "2019-20". */
const extractYear = (value) => {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  return match ? match[0] : null;
};

const loadCsv = () => {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(
      `CSV not found at ${INPUT_PATH}. Put the file there and retry.`
    );
  }
  const content = fs.readFileSync(INPUT_PATH, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { header, rows };
};

const main = () => {
  const { header, rows } = loadCsv();
  const idx = {
    country: header.indexOf("country"),
    source: header.indexOf("source"),
    type: header.indexOf("type"),
    segment: header.indexOf("segment"),
    reason: header.indexOf("reason"),
    baseYear: header.indexOf("baseYear"),
    emissions: header.indexOf("emissions (kt)"),
  };

  // Filter to Russia / IEA / Energy / Total to get aggregate national
  // energy-sector methane, which is the best proxy for West Siberian
  // gas infrastructure leakage (the region accounts for ~70% of Russian
  // gas production).
  const series = rows
    .filter((row) => row[idx.country] === "Russia")
    .filter((row) => row[idx.source] === "IEA")
    .filter((row) => row[idx.type] === "Energy")
    .filter((row) => row[idx.segment] === "Total")
    .filter((row) => row[idx.reason] === "All")
    .map((row) => {
      const year = extractYear(row[idx.baseYear]);
      const ktValue = parseNumber(row[idx.emissions]);
      if (!year || ktValue === null) return null;
      // Convert kilotonnes to megatonnes for consistency with other metrics
      const mtValue = ktValue / 1000;
      return { date: year, value: Number(mtValue.toFixed(3)) };
    })
    .filter(Boolean);

  // Deduplicate by year (IEA sometimes has overlapping revision rows)
  // and sort chronologically
  const deduped = Array.from(
    new Map(series.map((item) => [item.date, item])).values()
  ).sort((a, b) => Number(a.date) - Number(b.date));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${deduped.length} rows to ${OUTPUT_PATH}`);
};

main();
