const { spawnSync } = require("child_process");
const path = require("path");
const { edgarQueries } = require("../../data/edgarQueries.js");

const PYTHON = process.env.EDGAR_PYTHON || "python3";
const SCRIPT_PATH = path.join(__dirname, "aggregate_bbox.py");

const runQuery = (metricKey, query) => {
  const baseDir = path.join(__dirname, "..", "..", "data", "raw", "edgar");
  const outputPath = path.join(__dirname, "..", "..", query.outputPath);
  const bboxArg = query.bbox.join(",");
  const varName = query.var;

  const files = require("fs")
    .readdirSync(path.join(baseDir, "TOTALS_emi_nc"))
    .filter((name) =>
      name.startsWith(`${query.release}_GHG_${query.gas}_`)
    )
    .filter((name) => name.endsWith(`_${query.sector}_emi.nc`))
    .map((name) => path.join(baseDir, "TOTALS_emi_nc", name))
    .sort();

  if (!files.length) {
    console.warn(`No EDGAR files found for ${metricKey}, skipping.`);
    return;
  }

  const result = spawnSync(
    PYTHON,
    [SCRIPT_PATH, "--input", files.join(","), "--bbox", bboxArg, "--var", varName, "--output", outputPath],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    throw new Error(`EDGAR aggregation failed for ${metricKey}`);
  }
};

const main = () => {
  Object.entries(edgarQueries).forEach(([metricKey, query]) => {
    runQuery(metricKey, query);
  });
};

main();

