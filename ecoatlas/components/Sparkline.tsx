"use client";

type DataPoint = { date: string; value: number };

type DataChartProps = {
  series: DataPoint[];
  width?: number;
  height?: number;
  accentColor?: string;
  unit?: string;
};

const formatAxisValue = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) < 1 && value !== 0) return value.toFixed(2);
  return value.toFixed(Math.abs(value) < 100 ? 1 : 0);
};

const extractYear = (date: string): string => {
  if (/^\d{4}$/.test(date)) return date;
  return date.slice(0, 4);
};

export default function DataChart({
  series,
  width = 340,
  height = 160,
  accentColor = "#60a5fa",
  unit = "",
}: DataChartProps) {
  if (series.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 13 }}>
        No data available
      </div>
    );
  }

  const marginLeft = 48;
  const marginRight = 12;
  const marginTop = 12;
  const marginBottom = 28;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;

  const values = series.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.08;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  const midVal = (minVal + maxVal) / 2;

  const toX = (i: number) =>
    marginLeft + (series.length === 1 ? chartW / 2 : (i / (series.length - 1)) * chartW);
  const toY = (v: number) =>
    marginTop + chartH - ((v - yMin) / yRange) * chartH;

  const linePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${toX(series.length - 1).toFixed(1)} ${(marginTop + chartH).toFixed(1)}` +
    ` L ${toX(0).toFixed(1)} ${(marginTop + chartH).toFixed(1)} Z`;

  // X-axis labels: first, middle, last
  const xLabels: { x: number; label: string }[] = [];
  if (series.length >= 1) {
    xLabels.push({ x: toX(0), label: extractYear(series[0].date) });
  }
  if (series.length >= 3) {
    const midIdx = Math.floor(series.length / 2);
    xLabels.push({ x: toX(midIdx), label: extractYear(series[midIdx].date) });
  }
  if (series.length >= 2) {
    xLabels.push({ x: toX(series.length - 1), label: extractYear(series[series.length - 1].date) });
  }

  // Y-axis labels: min, mid, max
  const yLabels = [
    { y: toY(maxVal), label: formatAxisValue(maxVal) },
    { y: toY(midVal), label: formatAxisValue(midVal) },
    { y: toY(minVal), label: formatAxisValue(minVal) },
  ];

  const gradientId = `chart-gradient-${accentColor.replace("#", "")}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yLabels.map((yl, i) => (
        <line
          key={i}
          x1={marginLeft}
          y1={yl.y}
          x2={width - marginRight}
          y2={yl.y}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Filled area */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        stroke={accentColor}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {series.map((p, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(p.value)}
          r={3.5}
          fill="#1a1a1a"
          stroke={accentColor}
          strokeWidth="2"
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map((yl, i) => (
        <text
          key={i}
          x={marginLeft - 8}
          y={yl.y}
          textAnchor="end"
          dominantBaseline="middle"
          fill="#6b7280"
          fontSize="10"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {yl.label}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={xl.x}
          y={height - 6}
          textAnchor="middle"
          fill="#6b7280"
          fontSize="10"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {xl.label}
        </text>
      ))}

      {/* Unit label */}
      {unit && (
        <text
          x={marginLeft - 8}
          y={marginTop - 2}
          textAnchor="end"
          fill="#4b5563"
          fontSize="9"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {unit}
        </text>
      )}
    </svg>
  );
}

export type { DataPoint, DataChartProps };
