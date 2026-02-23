/**
 * Standalone fetcher for NOAA Mauna Loa CO2 monthly mean data.
 *
 * Downloads the official Mauna Loa Observatory CO2 record from NOAA's
 * Global Monitoring Laboratory and writes it as a series file for the
 * "Global Atmosphere" hotspot (hs-000).
 *
 * This runs outside the main ingest.ts pipeline because the NOAA data
 * is a plain-text file with a custom format (not a REST API), and it's
 * the only metric for hs-000.
 *
 * Run: node scripts/fetch_co2_mlo.js
 * Output: data/series/hs-000/co2_ppm_monthly.json
 *
 * Source: https://gml.noaa.gov/ccgg/trends/data.html
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SOURCE_URL =
  "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt";

const outputPath = path.join(
  __dirname,
  "..",
  "data",
  "series",
  "hs-000",
  "co2_ppm_monthly.json"
);

/**
 * Parses NOAA's fixed-width text format.
 *
 * Lines starting with # are comments. Data columns are whitespace-separated:
 *   [0] year  [1] month  [2] decimal_date  [3] monthly_average  [4] de-seasonalised  ...
 *
 * Column [3] is the monthly mean CO2 in ppm. NOAA uses -99.99 as a sentinel
 * for missing months (e.g. equipment downtime during the 2022 eruption pause).
 */
const parseCo2Text = (text) => {
  const lines = text.split("\n");
  const series = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const value = Number(parts[3]);

    if (!Number.isFinite(value) || value < -90) continue;

    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    series.push({ date, value });
  }

  return series;
};

const fetchText = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed: ${res.statusCode}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });

const main = async () => {
  const text = await fetchText(SOURCE_URL);
  const series = parseCo2Text(text);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(series, null, 2) + "\n", "utf-8");

  console.log(`Wrote ${series.length} points to ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
