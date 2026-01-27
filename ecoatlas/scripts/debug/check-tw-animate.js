import fs from "fs";
import path from "path";
import { createRequire } from "module";

const endpoint =
  "http://127.0.0.1:7242/ingest/fdfe55d5-da17-4fb5-9175-489ff568fdc7";
const logPath =
  "/Users/carsonchristensen/Desktop/EcoAtlas/.cursor/debug.log";

const require = createRequire(import.meta.url);

const sendLog = (payload) => {
  try {
    fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore
  }

  if (typeof fetch === "function") {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    return;
  }

  try {
    const http = require("node:http");
    const data = JSON.stringify(payload);
    const req = http.request(
      endpoint,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      () => {}
    );
    req.on("error", () => {});
    req.write(data);
    req.end();
  } catch {
    // ignore
  }
};

const timestamp = Date.now();
const sessionId = "debug-session";
const runId = "pre-fix";
const cwd = process.cwd();
const pkgPath = path.join(cwd, "package.json");
const nmPath = path.join(cwd, "node_modules");
const twAnimatePath = path.join(nmPath, "tw-animate-css");
const tailwindAnimatePath = path.join(nmPath, "tailwindcss-animate");

// #region agent log
sendLog({
  sessionId,
  runId,
  hypothesisId: "H3",
  location: "scripts/debug/check-tw-animate.js:23",
  message: "cwd check",
  data: { cwd },
  timestamp,
});
// #endregion

// #region agent log
sendLog({
  sessionId,
  runId,
  hypothesisId: "H3",
  location: "scripts/debug/check-tw-animate.js:34",
  message: "node_modules existence",
  data: { nodeModulesExists: fs.existsSync(nmPath) },
  timestamp,
});
// #endregion

// #region agent log
sendLog({
  sessionId,
  runId,
  hypothesisId: "H1",
  location: "scripts/debug/check-tw-animate.js:44",
  message: "tw-animate-css module existence",
  data: { twAnimateExists: fs.existsSync(twAnimatePath) },
  timestamp,
});
// #endregion

// #region agent log
sendLog({
  sessionId,
  runId,
  hypothesisId: "H2",
  location: "scripts/debug/check-tw-animate.js:54",
  message: "tailwindcss-animate module existence",
  data: { tailwindAnimateExists: fs.existsSync(tailwindAnimatePath) },
  timestamp,
});
// #endregion

// #region agent log
sendLog({
  sessionId,
  runId,
  hypothesisId: "H4",
  location: "scripts/debug/check-tw-animate.js:64",
  message: "package.json dependency presence",
  data: {
    packageJsonExists: fs.existsSync(pkgPath),
    hasTwAnimateDependency:
      fs.existsSync(pkgPath) &&
      JSON.parse(fs.readFileSync(pkgPath, "utf-8")).dependencies?.[
        "tw-animate-css"
      ] !== undefined,
  },
  timestamp,
});
// #endregion
