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

    // NOAA uses -99.99 for missing values.
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

