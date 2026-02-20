"use client";

import { useState } from "react";
import type { MetricValue } from "@/src/lib/schemas/metrics";
import DataChart from "@/components/Sparkline";

type MetricCardProps = {
  title: string;
  metric: MetricValue;
  sourceName?: string;
  sourceUrl?: string;
  sourceCadence?: string;
  description?: string;
  accentColor?: string;
  formattedValue?: string;
  scaleContext?: string;
  showTable?: boolean;
  tablePoints?: number;
};

const formatNum = (value: number, unit?: string): string => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDate = (date: string): string => {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 7);
  if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
  return date;
};

export default function MetricCard({
  title,
  metric,
  sourceName,
  sourceUrl,
  sourceCadence,
  description,
  accentColor = "#60a5fa",
  formattedValue,
  scaleContext,
}: MetricCardProps) {
  const [tableOpen, setTableOpen] = useState(false);

  // --- Snapshot metric ---
  if (metric.kind === "snapshot") {
    const displayValue = formattedValue ?? `${formatNum(metric.value)} ${metric.unit}`;
    return (
      <div style={{
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "#1f1f1f",
        padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{description}</div>
        )}
        <div style={{ fontSize: 32, fontWeight: 700, color: "#ffffff", marginTop: 12 }}>
          {displayValue}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          As of {metric.asOfYear}
        </div>
        {renderSource(sourceName, sourceUrl, sourceCadence)}
      </div>
    );
  }

  // --- Series metric ---
  const { series, unit } = metric;
  const first = series[0];
  const last = series[series.length - 1];

  // Trend calculation
  const absoluteChange = last.value - first.value;
  const percentChange = first.value !== 0
    ? ((absoluteChange / Math.abs(first.value)) * 100)
    : 0;
  const isPositive = absoluteChange > 0;
  const trendArrow = isPositive ? "↑" : absoluteChange < 0 ? "↓" : "→";
  const trendColor = isPositive ? "#f87171" : absoluteChange < 0 ? "#4ade80" : "#9ca3af";

  return (
    <div style={{
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
      backgroundColor: "#1f1f1f",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex",
        gap: 0,
        padding: "16px 20px",
      }}>
        {/* Latest value */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 4 }}>
            Latest
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", lineHeight: 1.1 }}>
            {formatNum(last.value)}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            {unit} · {formatDate(last.date)}
          </div>
        </div>

        {/* Change */}
        <div style={{ flex: 1, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 4 }}>
            Change
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: trendColor, lineHeight: 1.1 }}>
            {trendArrow} {Math.abs(percentChange).toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            {isPositive ? "+" : ""}{formatNum(absoluteChange)} {unit}
          </div>
        </div>

        {/* Period */}
        <div style={{ flex: 0.7, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 4 }}>
            Period
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db", lineHeight: 1.3 }}>
            {formatDate(first.date)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db" }}>
            {formatDate(last.date)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "0 8px 4px" }}>
        <DataChart
          series={series}
          accentColor={accentColor}
          unit={unit}
          height={150}
        />
      </div>

      {/* View data toggle + table */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={() => setTableOpen(!tableOpen)}
          style={{
            width: "100%",
            padding: "10px 20px",
            fontSize: 12,
            fontWeight: 500,
            color: "#9ca3af",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
        >
          <span>{tableOpen ? "Hide data" : "View data"}</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: tableOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {tableOpen && (
          <div style={{ padding: "0 20px 16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 0", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    Year
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 0", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    Value ({unit})
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.map((row, i) => (
                  <tr key={row.date}>
                    <td style={{
                      padding: "6px 0",
                      color: "#d1d5db",
                      backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}>
                      {formatDate(row.date)}
                    </td>
                    <td style={{
                      padding: "6px 0",
                      textAlign: "right",
                      color: "#ffffff",
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}>
                      {row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Source attribution */}
      {(sourceName || scaleContext) && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {renderSource(sourceName, sourceUrl, sourceCadence)}
          {scaleContext && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
              {scaleContext}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderSource(sourceName?: string, sourceUrl?: string, cadence?: string) {
  if (!sourceName) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 11, color: "#6b7280" }}>
        Source:{" "}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            {sourceName}
          </a>
        ) : (
          sourceName
        )}
      </span>
      {cadence && (
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#9ca3af",
          backgroundColor: "rgba(255,255,255,0.06)",
          padding: "2px 6px",
          borderRadius: 4,
          textTransform: "capitalize",
        }}>
          {cadence}
        </span>
      )}
    </div>
  );
}
