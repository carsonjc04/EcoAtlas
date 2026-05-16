import type { MetricValue } from "@/src/lib/schemas/metrics";

export type TrajectoryMetricPoint = {
  year: number;
  value: number;
};

export type ImpactTrajectory = {
  metricKey: string;
  unit: string;
  historical: TrajectoryMetricPoint[];
  projected: TrajectoryMetricPoint[];
  latestObservedYear: number;
  latestObservedValue: number;
  endYear: number;
  endValue: number;
  multiplier: number;
  percentChangeFromLatest: number;
  annualGrowthRate: number;
};

type BuildImpactTrajectoryInput = {
  metrics?: Record<string, MetricValue>;
  severity: number;
  type: "driver" | "impact";
  endYear?: number;
};

const DEFAULT_END_YEAR = 2050;

const parseYear = (date: string) => {
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
};

export const selectPrimarySeriesMetric = (metrics?: Record<string, MetricValue>) => {
  if (!metrics) return null;

  for (const [metricKey, metric] of Object.entries(metrics)) {
    if (metric.kind === "series" && metric.series.length > 0) {
      return { metricKey, metric };
    }
  }

  return null;
};

export const normalizeSeriesToAnnualPoints = (
  series: { date: string; value: number }[]
): TrajectoryMetricPoint[] => {
  const latestByYear = new Map<number, { date: string; value: number }>();

  for (const point of series) {
    const year = parseYear(point.date);
    if (year === null || !Number.isFinite(point.value)) continue;

    const existing = latestByYear.get(year);
    if (!existing || point.date.localeCompare(existing.date) >= 0) {
      latestByYear.set(year, point);
    }
  }

  return Array.from(latestByYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, point]) => ({ year, value: point.value }));
};

export const getSeverityAdjustedGrowthRate = (
  severity: number,
  type: "driver" | "impact"
) => {
  const normalizedSeverity = Math.min(10, Math.max(1, severity)) / 10;
  const baseRate = type === "impact" ? 0.012 : 0.009;
  const severityRate = type === "impact" ? 0.034 : 0.026;

  return baseRate + normalizedSeverity * severityRate;
};

export const buildImpactTrajectory = ({
  metrics,
  severity,
  type,
  endYear = DEFAULT_END_YEAR,
}: BuildImpactTrajectoryInput): ImpactTrajectory | null => {
  const selectedMetric = selectPrimarySeriesMetric(metrics);
  if (!selectedMetric) return null;

  const historical = normalizeSeriesToAnnualPoints(selectedMetric.metric.series);
  if (historical.length === 0) return null;

  const latest = historical[historical.length - 1];
  const annualGrowthRate = getSeverityAdjustedGrowthRate(severity, type);
  const projected: TrajectoryMetricPoint[] = [{ ...latest }];

  for (let year = latest.year + 1; year <= endYear; year += 1) {
    const yearsFromLatest = year - latest.year;
    projected.push({
      year,
      value: latest.value * Math.exp(annualGrowthRate * yearsFromLatest),
    });
  }

  const endValue = projected[projected.length - 1]?.value ?? latest.value;
  const multiplier = latest.value === 0 ? 0 : endValue / latest.value;
  const percentChangeFromLatest =
    latest.value === 0 ? 0 : ((endValue - latest.value) / Math.abs(latest.value)) * 100;

  return {
    metricKey: selectedMetric.metricKey,
    unit: selectedMetric.metric.unit,
    historical,
    projected,
    latestObservedYear: latest.year,
    latestObservedValue: latest.value,
    endYear,
    endValue,
    multiplier,
    percentChangeFromLatest,
    annualGrowthRate,
  };
};

export const getTrajectoryValueAtYear = (
  trajectory: ImpactTrajectory,
  year: number
) => {
  const points = [...trajectory.historical, ...trajectory.projected.slice(1)];
  if (points.length === 0) return null;

  const clampedYear = Math.min(
    trajectory.endYear,
    Math.max(points[0].year, Math.round(year))
  );

  const exact = points.find((point) => point.year === clampedYear);
  if (exact) return exact;

  const previous = [...points].reverse().find((point) => point.year < clampedYear);
  const next = points.find((point) => point.year > clampedYear);

  if (!previous) return points[0];
  if (!next) return points[points.length - 1];

  const progress = (clampedYear - previous.year) / (next.year - previous.year);
  return {
    year: clampedYear,
    value: previous.value + (next.value - previous.value) * progress,
  };
};
