"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MetricValue } from "../../src/lib/schemas/metrics";
import MetricCard from "@/components/MetricCard";
import InfoTable from "@/components/InfoTable";
import Sidebar from "@/components/Sidebar";
import { Separator } from "@/components/ui/separator";
import { sourceMap } from "../../src/data/sourceMap";
import { track } from "../../lib/analytics";

type HotspotListItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: number;
  topic: string;
  type: "driver" | "impact";
};

type HotspotDetail = HotspotListItem & {
  title?: string;
  summary?: string;
  story?: {
    headline: string;
    summary: string;
    climateImpact: string;
    causeEffect: string[];
    scaleContext?: string;
    outlook?: string;
  };
  sources: string[];
  series: { year: number; value: number }[];
  metrics?: Record<string, MetricValue>;
};

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const panelWidth = 420;

// Driver (red) vs impact (blue) colors.
const typeToColor = (type: HotspotListItem["type"]) =>
  type === "driver" ? "#dc143c" : "#2f54eb";

const humanizeMetricKey = (metricKey: string) =>
  metricKey
    .replace(/_/g, " ")
    .replace(/\bco2\b/gi, "CO₂")
    .replace(/\bch4\b/gi, "CH₄")
    .replace(/\bmtco2e\b/gi, "MtCO₂e")
    .replace(/\bmha\b/gi, "Mha");

const formatNumber = (value: number, unit?: string) => {
  const maxFractionDigits = unit === "%" ? 2 : 2;
  return value.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
};

const getLatest = (series: { date: string; value: number }[]) => {
  if (!series.length) return null;
  return series[series.length - 1];
};

export default function GlobeView() {
  const [hotspots, setHotspots] = useState<HotspotListItem[]>([]);
  const [selectedHotspot, setSelectedHotspot] =
    useState<HotspotDetail | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "data" | "sources">(
    "story"
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [errorHotspots, setErrorHotspots] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>(
    {}
  );
  const hasTrackedGlobeLoad = useRef(false);
  const lastRequestedId = useRef<string | null>(null);

  // Track window size so the globe fills the screen.
  useEffect(() => {
    const updateSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Load hotspot list from the API.
  useEffect(() => {
    let isMounted = true;
    const loadHotspots = async () => {
      setLoadingHotspots(true);
      setErrorHotspots(null);
      try {
        const response = await fetch("/api/hotspots");
        if (!response.ok) {
          if (isMounted) {
            setErrorHotspots("Failed to load hotspots");
            setHotspots([]);
          }
          return;
        }
        const data = (await response.json()) as HotspotListItem[];
        if (isMounted) {
          setHotspots(data);
        }
      } catch {
        if (isMounted) {
          setErrorHotspots("Failed to load hotspots");
          setHotspots([]);
        }
      } finally {
        if (isMounted) {
          setLoadingHotspots(false);
        }
      }
    };

    loadHotspots();
    return () => {
      isMounted = false;
    };
  }, []);

  // Track globe load once per page view, regardless of fetch outcome.
  useEffect(() => {
    if (!hasTrackedGlobeLoad.current) {
      track("globe_loaded");
      hasTrackedGlobeLoad.current = true;
    }
  }, []);

  const activePanelWidth = isPanelOpen ? panelWidth : 0;
  const globeWidth = Math.max(0, dimensions.width - activePanelWidth);

  const severityLabel = (severity: number) => {
    if (severity >= 5) return "Extreme";
    if (severity >= 4) return "High";
    if (severity >= 3) return "Moderate";
    return "Low";
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <div style={{ flex: 1, background: "#f5f7fa", position: "relative" }}>
        <Globe
          width={globeWidth}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          pointsData={hotspots}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d) => typeToColor((d as HotspotListItem).type)}
          pointAltitude={0}
          pointRadius={0.55}
          pointLabel={(d) => {
            const item = d as HotspotListItem;
            const typeLabel = item.type === "driver" ? "Driver" : "Impact";
            return `${item.name} (${typeLabel})`;
          }}
          onPointClick={async (point) => {
            const item = point as HotspotListItem;
            track("hotspot_clicked", { hotspotId: item.id });
            lastRequestedId.current = item.id;
            setLoadingDetail(true);
            try {
              const response = await fetch(`/api/hotspots/${item.id}`);
              if (!response.ok) {
                if (lastRequestedId.current === item.id) {
                  setLoadingDetail(false);
                }
                return;
              }
              const detail = (await response.json()) as HotspotDetail;
              if (lastRequestedId.current !== item.id) return;
              setSelectedHotspot(detail);
              setIsPanelOpen(true);
              setActiveTab("story");
              setLoadingDetail(false);
              track("panel_opened", { hotspotId: item.id });
            } catch {
              if (lastRequestedId.current === item.id) {
                setLoadingDetail(false);
              }
            }
          }}
        />
        {(loadingHotspots || errorHotspots) && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "6px 10px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {loadingHotspots ? "Loading hotspots..." : errorHotspots}
          </div>
        )}
      </div>

      {/* Right-side panel with selected hotspot details */}
      {isPanelOpen && selectedHotspot ? (
        <Sidebar
          title={selectedHotspot.name}
          subtitle={`${
            selectedHotspot.type === "driver" ? "Driver" : "Impact"
          } • ${selectedHotspot.topic}`}
          badgeLabel={severityLabel(selectedHotspot.severity)}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onClose={() => setIsPanelOpen(false)}
          story={
            <div className="space-y-6">
              <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  Description
                </p>
                <h3 className="text-base font-semibold text-white">
                  {selectedHotspot.story?.headline ??
                    selectedHotspot.title ??
                    "Story unavailable"}
                </h3>
                <p className="text-sm leading-relaxed text-white/80">
                  {selectedHotspot.story?.summary ??
                    selectedHotspot.summary ??
                    "Summary unavailable."}
                </p>
              </section>

              <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  {selectedHotspot.type === "driver"
                    ? "Climate contribution"
                    : "Climate impact"}
                </p>
                <p className="text-sm leading-relaxed text-white/80">
                  {selectedHotspot.story?.climateImpact ??
                    "Global warming impacts are being assessed."}
                </p>
              </section>

              <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  Cause → Effect
                </p>
                <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-white/80">
                  {(selectedHotspot.story?.causeEffect ?? [
                    "Data is being gathered",
                    "Impacts are under review",
                    "More analysis is expected",
                  ]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              {selectedHotspot.story?.scaleContext && (
                <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">
                    Scale & context
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {selectedHotspot.story.scaleContext}
                  </p>
                </section>
              )}

              {selectedHotspot.story?.outlook && (
                <section className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">
                    Outlook
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {selectedHotspot.story.outlook}
                  </p>
                </section>
              )}
            </div>
          }
          data={(() => {
            if (loadingDetail) {
              return (
                <div className="animate-pulse rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  Loading details...
                </div>
              );
            }

            const metrics = selectedHotspot.metrics;
            const mapping = sourceMap.hotspots.find(
              (item) => item.hotspotId === selectedHotspot.id
            );
            const rows =
              mapping?.metrics.map((metricMapping) => ({
                mapping: metricMapping,
                value: metrics?.[metricMapping.metricKey],
              })) ?? [];

            if (rows.length > 0) {
              return (
                <div className="space-y-4">
                  {rows.map(({ mapping: metricMapping, value }) => {
                    const source = sourceMap.sources.find(
                      (item) => item.id === metricMapping.sources[0]
                    );
                    const unit = metricMapping.unit ?? value?.unit ?? "";
                    const metricTitle = humanizeMetricKey(
                      metricMapping.metricKey
                    );

                    if (!value) {
                      return (
                        <div
                          key={metricMapping.metricKey}
                          className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-100"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-slate-400">
                            {metricTitle}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {metricMapping.description}
                          </div>
                          <div className="mt-3 text-sm text-slate-200">
                            {metricMapping.status === "planned"
                              ? "Planned"
                              : "Not available"}
                          </div>
                        </div>
                      );
                    }

                    if (value.kind === "snapshot") {
                      const formattedValue = `${formatNumber(
                        value.value,
                        unit
                      )}${unit} (as of ${value.asOfYear})`;

                      return (
                        <MetricCard
                          key={metricMapping.metricKey}
                          title={metricTitle}
                          metric={value}
                          description={metricMapping.description}
                          sourceName={source?.publisher ?? source?.name}
                          sourceUrl={source?.url}
                          formattedValue={formattedValue}
                        />
                      );
                    }

                    const isExpanded =
                      expandedMetrics[metricMapping.metricKey] ?? false;
                    const seriesToShow = isExpanded
                      ? value.series
                      : value.series.slice(-12);
                    const metricForCard = { ...value, series: seriesToShow };

                    return (
                      <div key={metricMapping.metricKey}>
                        <MetricCard
                          title={metricTitle}
                          metric={metricForCard}
                          description={metricMapping.description}
                          sourceName={source?.publisher ?? source?.name}
                          sourceUrl={source?.url}
                          showTable
                          tablePoints={seriesToShow.length}
                        />
                        {value.series.length > 12 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMetrics((prev) => ({
                                ...prev,
                                [metricMapping.metricKey]: !isExpanded,
                              }))
                            }
                            className="mt-2 text-xs text-slate-300 transition hover:text-white"
                          >
                            {isExpanded ? "Show less" : "Show all"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <InfoTable
                rows={selectedHotspot.series.map((row) => ({
                  label: `${row.year}`,
                  value: formatNumber(row.value),
                }))}
              />
            );
          })()}
          sources={(() => {
            const mapping = sourceMap.hotspots.find(
              (item) => item.hotspotId === selectedHotspot.id
            );
            const sourceIds = Array.from(
              new Set(mapping?.metrics.flatMap((metric) => metric.sources) ?? [])
            );
            const sources = sourceIds
              .map((id) => sourceMap.sources.find((source) => source.id === id))
              .filter((source): source is NonNullable<typeof source> => !!source)
              .map((source) => ({
                label: source.publisher ?? source.name,
                url: source.url,
              }));

            return (
              <ul className="space-y-2 text-sm text-slate-200">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-white/20 transition hover:text-white hover:decoration-white/40"
                      onClick={() =>
                        track("source_clicked", {
                          hotspotId: selectedHotspot.id,
                          url: source.url,
                        })
                      }
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            );
          })()}
        />
      ) : null}
    </div>
  );
}

