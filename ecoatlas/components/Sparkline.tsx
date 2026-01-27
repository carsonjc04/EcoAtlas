type SparklinePoint = { date: string; value: number };

type SparklineProps = {
  series: SparklinePoint[];
  width?: number;
  height?: number;
  padding?: number;
};

const buildPath = (
  series: SparklinePoint[],
  width: number,
  height: number,
  padding: number
) => {
  if (series.length === 0) return "";
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = innerWidth / (series.length - 1 || 1);

  return series
    .map((point, index) => {
      const x = padding + index * stepX;
      const normalized = (point.value - min) / range;
      const y = padding + innerHeight - normalized * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

export default function Sparkline({
  series,
  width = 220,
  height = 56,
  padding = 6,
}: SparklineProps) {
  if (series.length === 0) {
    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      />
    );
  }

  const path = buildPath(series, width, height, padding);
  const last = series[series.length - 1];
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerHeight = height - padding * 2;
  const lastY =
    padding + innerHeight - ((last?.value ?? 0) - min) / range * innerHeight;
  const lastX =
    series.length === 1
      ? width - padding
      : padding +
        (series.length - 1) *
          ((width - padding * 2) / (series.length - 1));

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {series.length > 1 ? (
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-blue-500"
        />
      ) : (
        <line
          x1={padding}
          y1={lastY}
          x2={width - padding}
          y2={lastY}
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-500"
        />
      )}
      {series.length > 0 && (
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          className="fill-blue-400"
        />
      )}
    </svg>
  );
}
