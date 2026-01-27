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

