/**
 * Zod schema for metric values — the canonical contract between the data
 * pipeline, API routes, and frontend components.
 *
 * Every metric attached to a hotspot is one of two kinds:
 *
 *   "series"   — Chronological data points produced by scripts/ingest.ts.
 *                Rendered as Sparkline charts in the sidebar Data tab.
 *                Example: monthly CO2 readings, annual deforestation area.
 *
 *   "snapshot" — A single value at a point in time, manually curated in
 *                data/metricsSnapshots.ts for metrics where time-series
 *                data isn't yet available (planned fetcher or static source).
 *                Rendered as a static MetricCard with the asOfYear label.
 *
 * Both the API detail route and the test suite validate against this schema,
 * so any shape change here will surface as build or test failures.
 */

import { z } from "zod";

export const MetricValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("series"),
    unit: z.string(),
    series: z.array(
      z.object({
        date: z.string(),
        value: z.number(),
      })
    ),
    sourceId: z.string(),
  }),
  z.object({
    kind: z.literal("snapshot"),
    unit: z.string(),
    value: z.number(),
    asOfYear: z.number(),
    sourceId: z.string(),
  }),
]);

export type MetricValue = z.infer<typeof MetricValueSchema>;

