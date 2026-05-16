"use client";

import {
  getTrajectoryValueAtYear,
  type ImpactTrajectory,
  type TrajectoryMetricPoint,
} from "@/lib/impactTrajectory";

type ImpactTrajectoryChartProps = {
  trajectory: ImpactTrajectory;
  selectedYear: number;
  accentColor?: string;
  width?: number;
  height?: number;
};

const formatMetricKey = (metricKey: string) =>
  metricKey
    .replace(/_/g, " ")
    .replace(/\bco2\b/gi, "CO2")
    .replace(/\bch4\b/gi, "CH4")
    .replace(/\bmtco2e\b/gi, "MtCO2e");

const formatValue = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const buildPath = (
  points: TrajectoryMetricPoint[],
  toX: (year: number) => number,
  toY: (value: number) => number
) =>
  points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${toX(point.year).toFixed(1)} ${toY(point.value).toFixed(1)}`;
    })
    .join(" ");

export default function ImpactTrajectoryChart({
  trajectory,
  selectedYear,
  accentColor = "#60a5fa",
  width = 340,
  height = 220,
}: ImpactTrajectoryChartProps) {
  const marginLeft = 48;
  const marginRight = 18;
  const marginTop = 18;
  const marginBottom = 34;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;

  const allPoints = [...trajectory.historical, ...trajectory.projected.slice(1)];
  const values = allPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || Math.max(Math.abs(maxValue), 1);
  const yMin = minValue - valueRange * 0.08;
  const yMax = maxValue + valueRange * 0.08;
  const yRange = yMax - yMin || 1;

  const minYear = Math.min(1990, trajectory.historical[0]?.year ?? 1990);
  const maxYear = trajectory.endYear;
  const yearRange = maxYear - minYear || 1;

  const toX = (year: number) => marginLeft + ((year - minYear) / yearRange) * chartW;
  const toY = (value: number) => marginTop + chartH - ((value - yMin) / yRange) * chartH;

  const selectedPoint = getTrajectoryValueAtYear(trajectory, selectedYear);
  const selectedMarkerYear = selectedPoint?.year ?? trajectory.latestObservedYear;
  const selectedMarkerValue = selectedPoint?.value ?? trajectory.latestObservedValue;
  const selectedIsProjected = selectedMarkerYear > trajectory.latestObservedYear;
  const selectedDelta =
    trajectory.latestObservedValue === 0
      ? 0
      : ((selectedMarkerValue - trajectory.latestObservedValue) /
          Math.abs(trajectory.latestObservedValue)) *
        100;

  const historicalPath = buildPath(trajectory.historical, toX, toY);
  const projectedPath = buildPath(trajectory.projected, toX, toY);
  const gradientId = `impact-trajectory-${trajectory.metricKey.replace(/[^a-z0-9]/gi, "-")}`;

  const yLabels = [
    { value: maxValue, label: formatValue(maxValue) },
    { value: (minValue + maxValue) / 2, label: formatValue((minValue + maxValue) / 2) },
    { value: minValue, label: formatValue(minValue) },
  ];

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "#1f1f1f",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>
          Impact trajectory
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, color: "#ffffff", textTransform: "capitalize" }}>
          {formatMetricKey(trajectory.metricKey)}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: "#9ca3af" }}>
          Solid line shows observed data. Dashed line is an illustrative projection to 2050.
        </div>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Impact trajectory chart for ${formatMetricKey(trajectory.metricKey)}`}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yLabels.map((label) => (
          <g key={label.label}>
            <line
              x1={marginLeft}
              y1={toY(label.value)}
              x2={width - marginRight}
              y2={toY(label.value)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 4"
            />
            <text
              x={marginLeft - 8}
              y={toY(label.value)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#6b7280"
              fontSize="10"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {label.label}
            </text>
          </g>
        ))}

        <path
          d={`${projectedPath} L ${toX(trajectory.endYear).toFixed(1)} ${(marginTop + chartH).toFixed(1)} L ${toX(trajectory.latestObservedYear).toFixed(1)} ${(marginTop + chartH).toFixed(1)} Z`}
          fill={`url(#${gradientId})`}
        />

        <path
          d={historicalPath}
          stroke={accentColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={projectedPath}
          stroke={accentColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 6"
          opacity="0.85"
        />

        <line
          x1={toX(selectedMarkerYear)}
          y1={marginTop}
          x2={toX(selectedMarkerYear)}
          y2={marginTop + chartH}
          stroke="rgba(255,255,255,0.35)"
          strokeDasharray="3 5"
        />
        <circle
          cx={toX(selectedMarkerYear)}
          cy={toY(selectedMarkerValue)}
          r="5"
          fill="#1f1f1f"
          stroke={accentColor}
          strokeWidth="2.5"
        />
        <circle
          cx={toX(selectedMarkerYear)}
          cy={toY(selectedMarkerValue)}
          r="9"
          fill={accentColor}
          opacity="0.12"
        />

        {[minYear, trajectory.latestObservedYear, trajectory.endYear].map((year) => (
          <text
            key={year}
            x={toX(year)}
            y={height - 8}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {year}
          </text>
        ))}

        {trajectory.unit && (
          <text
            x={marginLeft - 8}
            y={marginTop - 4}
            textAnchor="end"
            fill="#4b5563"
            fontSize="9"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {trajectory.unit}
          </text>
        )}
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ padding: "12px 16px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>
            {selectedIsProjected ? "Projected" : "Observed"} {selectedMarkerYear}
          </div>
          <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: "#ffffff" }}>
            {formatValue(selectedMarkerValue)}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: selectedDelta >= 0 ? "#f87171" : "#4ade80" }}>
            {selectedDelta >= 0 ? "+" : ""}
            {selectedDelta.toFixed(1)}% from latest
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>
            2050 projection
          </div>
          <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: "#ffffff" }}>
            {formatValue(trajectory.endValue)}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: "#f87171" }}>
            {trajectory.multiplier.toFixed(2)}x current level
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, lineHeight: 1.5, color: "#6b7280" }}>
        Projection is derived from observed trend, hotspot severity, and the Time Machine scenario. It is not a source-published forecast.
      </div>
    </div>
  );
}

export type { ImpactTrajectoryChartProps };
