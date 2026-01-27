import type { MetricValue } from "@/src/lib/schemas/metrics";
import Sparkline from "@/components/Sparkline";

type MetricCardProps = {
  title: string;
  metric: MetricValue;
  sourceName?: string;
  sourceUrl?: string;
  scaleContext?: string;
  formattedValue?: string;
  description?: string;
  showTable?: boolean;
  tablePoints?: number;
};

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function MetricCard({
  title,
  metric,
  sourceName,
  sourceUrl,
  scaleContext,
  formattedValue,
  description,
  showTable = false,
}: MetricCardProps) {
  const renderSource = () => {
    if (!sourceName) return null;
    return (
      <div className="mt-2 text-xs text-slate-400">
        Source:{" "}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-slate-500 transition hover:text-slate-200 hover:decoration-slate-300"
          >
            {sourceName}
          </a>
        ) : (
          sourceName
        )}
      </div>
    );
  };

  const formatDate = (date: string) => {
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 7);
    if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
    return date;
  };

  if (metric.kind === "snapshot") {
    const displayValue =
      formattedValue ?? `${formatNumber(metric.value)}${metric.unit}`;
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-100">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">
          {title}
        </div>
        {description && (
          <div className="mt-1 text-xs text-slate-400">{description}</div>
        )}
        <div className="mt-2 text-4xl font-semibold">{displayValue}</div>
        {!formattedValue && (
          <>
            <div className="text-sm text-slate-300">{metric.unit}</div>
            <div className="mt-1 text-xs text-slate-400">
              As of {metric.asOfYear}
            </div>
          </>
        )}
        {renderSource()}
        {scaleContext && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
            <div className="mb-1 text-[11px] uppercase text-slate-400">
              Scale context
            </div>
            {scaleContext}
          </div>
        )}
      </div>
    );
  }

  const series = metric.series;
  const last = series[series.length - 1];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-100">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {title}
      </div>
      {description && (
        <div className="mt-1 text-xs text-slate-400">{description}</div>
      )}
      <div className="mt-2 text-4xl font-semibold">
        {formatNumber(last.value)}
      </div>
      <div className="text-sm text-slate-300">{metric.unit}</div>
      <div className="mt-1 text-xs text-slate-400">
        Latest: {formatDate(last.date)}
      </div>
      <div className="mt-3 text-slate-200">
        <Sparkline series={series} />
      </div>
      {showTable && (
        <table className="mt-3 w-full border-collapse text-xs text-slate-300">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-1">Date</th>
              <th className="py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.date} className="border-t border-white/10">
                <td className="py-1">{formatDate(row.date)}</td>
                <td className="py-1">
                  {formatNumber(row.value)}
                  {metric.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {renderSource()}
      {scaleContext && (
        <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
          <div className="mb-1 text-[11px] uppercase text-slate-400">
            Scale context
          </div>
          {scaleContext}
        </div>
      )}
    </div>
  );
}
