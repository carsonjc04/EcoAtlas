"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MetricValue } from "../../src/lib/schemas/metrics";
import MetricCard from "@/components/MetricCard";
import InfoTable from "@/components/InfoTable";
import Sidebar from "@/components/Sidebar";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeRef = any;

// Driver (red) vs impact (blue) colors - transparent for soft glow, larger click area
const typeToColor = (type: HotspotListItem["type"]) =>
  type === "driver" ? "rgba(255, 100, 100, 0.25)" : "rgba(100, 140, 255, 0.25)";

// Ring colors with transparency for fading effect
const typeToRingColor = (type: HotspotListItem["type"]) =>
  type === "driver" 
    ? (t: number) => `rgba(255, 80, 80, ${0.6 * (1 - t)})`
    : (t: number) => `rgba(100, 150, 255, ${0.6 * (1 - t)})`;

// Solid colors for UI elements (search results, badges)
const typeToSolidColor = (type: HotspotListItem["type"]) =>
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

// Climate Clock calculations based on IPCC data
// Reference: https://climateclock.world/
const CLIMATE_CLOCK_CONFIG = {
  // Carbon budget remaining for 1.5°C (in Gt CO₂) - IPCC AR6 estimate as of Jan 2024
  carbonBudgetStartGt: 250,
  // Reference date for the budget
  referenceDate: new Date("2024-01-01T00:00:00Z"),
  // Global emissions rate (Gt CO₂/year)
  emissionsRateGtPerYear: 40.2,
  // Current warming above pre-industrial (°C)
  currentWarming: 1.29,
};

function useClimateClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { carbonBudgetStartGt, referenceDate, emissionsRateGtPerYear, currentWarming } =
    CLIMATE_CLOCK_CONFIG;

  // Calculate elapsed time since reference date
  const elapsedMs = now.getTime() - referenceDate.getTime();
  const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);

  // Calculate remaining carbon budget
  const emittedSinceReference = elapsedYears * emissionsRateGtPerYear;
  const remainingBudgetGt = Math.max(0, carbonBudgetStartGt - emittedSinceReference);

  // Calculate remaining time
  const remainingYears = remainingBudgetGt / emissionsRateGtPerYear;
  const years = Math.floor(remainingYears);
  const days = Math.floor((remainingYears - years) * 365.25);
  const hours = Math.floor(((remainingYears - years) * 365.25 - days) * 24);
  const minutes = Math.floor((((remainingYears - years) * 365.25 - days) * 24 - hours) * 60);
  const seconds = Math.floor(
    (((((remainingYears - years) * 365.25 - days) * 24 - hours) * 60 - minutes) * 60)
  );

  // Urgency level (0-1, where 1 is most urgent)
  const urgency = Math.min(1, Math.max(0, 1 - remainingYears / 10));

  return {
    currentWarming,
    remainingBudgetGt,
    emissionsRateGtPerYear,
    remainingTime: { years, days, hours, minutes, seconds },
    urgency,
  };
}

export default function GlobeView() {
  const [hotspots, setHotspots] = useState<HotspotListItem[]>([]);
  const [selectedHotspot, setSelectedHotspot] =
    useState<HotspotDetail | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClimateClockOpen, setIsClimateClockOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "data" | "trends" | "layers" | "sources">(
    "story"
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [errorHotspots, setErrorHotspots] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasTrackedGlobeLoad = useRef(false);
  const lastRequestedId = useRef<string | null>(null);
  const globeRef = useRef<GlobeRef>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  const climateClock = useClimateClock();

  // Filter hotspots based on search query
  const searchResults = searchQuery.trim()
    ? hotspots.filter((h) =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Handle clicking on a search result
  const handleSearchSelect = useCallback(
    async (hotspot: HotspotListItem) => {
      setSearchQuery("");
      setIsSearchFocused(false);

      // Rotate globe to the hotspot location
      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: hotspot.lat, lng: hotspot.lng, altitude: 2 },
          1000
        );
      }

      // Fetch hotspot details and open sidebar
      track("hotspot_clicked", { hotspotId: hotspot.id, source: "search" });
      lastRequestedId.current = hotspot.id;
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/hotspots/${hotspot.id}`);
        if (!response.ok) {
          if (lastRequestedId.current === hotspot.id) {
            setLoadingDetail(false);
          }
          return;
        }
        const detail = (await response.json()) as HotspotDetail;
        if (lastRequestedId.current !== hotspot.id) return;
        setSelectedHotspot(detail);
        setIsPanelOpen(true);
        setActiveTab("story");
        setLoadingDetail(false);
        track("panel_opened", { hotspotId: hotspot.id, source: "search" });
      } catch {
        if (lastRequestedId.current === hotspot.id) {
          setLoadingDetail(false);
        }
      }
    },
    []
  );

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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


  const severityLabel = (severity: number) => {
    if (severity >= 5) return "Extreme";
    if (severity >= 4) return "High";
    if (severity >= 3) return "Moderate";
    return "Low";
  };

  const sidebarWidth = 420;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Full-screen globe background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: isPanelOpen ? `translateX(${sidebarWidth / 2}px)` : "translateX(0)",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          // Soft glowing center points (larger for easier clicking)
          pointsData={hotspots}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d) => typeToColor((d as HotspotListItem).type)}
          pointAltitude={0.01}
          pointRadius={1.5}
          // Radiating rings for visual fade effect
          ringsData={hotspots}
          ringLat="lat"
          ringLng="lng"
          ringColor={(d: object) => typeToRingColor((d as HotspotListItem).type)}
          ringMaxRadius={4}
          ringPropagationSpeed={0.8}
          ringRepeatPeriod={2500}
          ringAltitude={0.005}
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
              top: 72,
              left: 12,
              padding: "6px 10px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              fontSize: 12,
              borderRadius: 6,
              zIndex: 10,
            }}
          >
            {loadingHotspots ? "Loading hotspots..." : errorHotspots}
          </div>
        )}
      </div>

      {/* Persistent Eco Atlas header - always visible */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          backgroundColor: "#0f0f0f",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          zIndex: 25,
        }}
      >
        {/* Eco Atlas Logo */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="18" cy="18" r="16" stroke="#4ade80" strokeWidth="1.5" fill="none" />
          <ellipse cx="18" cy="18" rx="16" ry="6" stroke="#4ade80" strokeWidth="1" fill="none" />
          <ellipse cx="18" cy="18" rx="16" ry="12" stroke="#4ade80" strokeWidth="0.75" fill="none" opacity="0.6" />
          <ellipse cx="18" cy="18" rx="6" ry="16" stroke="#4ade80" strokeWidth="1" fill="none" />
          <path
            d="M18 8C18 8 22 12 22 16C22 20 18 22 18 22C18 22 14 20 14 16C14 12 18 8 18 8Z"
            fill="#4ade80"
            opacity="0.3"
          />
          <path
            d="M18 10C18 10 20.5 13 20.5 16C20.5 19 18 20.5 18 20.5"
            stroke="#4ade80"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          Eco Atlas
        </span>
        {/* Breadcrumb for selected hotspot */}
        {selectedHotspot && (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              {selectedHotspot.name}
            </span>
          </>
        )}

        {/* Climate Clock - centered in header */}
        <button
          type="button"
          onClick={() => {
            setIsClimateClockOpen(true);
            setIsPanelOpen(false);
            track("climate_clock_opened");
          }}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 16px",
            backgroundColor: "transparent",
            border: `1px solid rgba(239, 68, 68, ${0.2 + climateClock.urgency * 0.3})`,
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: `0 0 ${10 + climateClock.urgency * 20}px rgba(239, 68, 68, ${0.1 + climateClock.urgency * 0.2})`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = `rgba(239, 68, 68, ${0.2 + climateClock.urgency * 0.3})`;
          }}
        >
          {/* Temperature */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>🌡</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: `rgb(${180 + climateClock.urgency * 75}, ${100 - climateClock.urgency * 50}, ${80 - climateClock.urgency * 30})`,
              }}
            >
              +{climateClock.currentWarming.toFixed(2)}°C
            </span>
          </div>

          {/* Countdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>🕒</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "#ef4444",
                letterSpacing: "0.02em",
              }}
            >
              {climateClock.remainingTime.years}y {climateClock.remainingTime.days}d{" "}
              {String(climateClock.remainingTime.hours).padStart(2, "0")}:
              {String(climateClock.remainingTime.minutes).padStart(2, "0")}:
              {String(climateClock.remainingTime.seconds).padStart(2, "0")}
            </span>
          </div>

          {/* Emissions rate */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fb923c" }}>
              {climateClock.emissionsRateGtPerYear} Gt/yr
            </span>
          </div>
        </button>
      </div>

      {/* Search bar and menu in top right */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 16,
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        {/* Menu button */}
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(true);
            track("menu_opened");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#252525";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#1a1a1a";
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Search bar */}
        <div
          ref={searchRef}
          style={{ width: 320 }}
        >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            backgroundColor: "#1a1a1a",
            borderRadius: isSearchFocused && searchResults.length > 0 ? "8px 8px 0 0" : 8,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Search icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search hotspots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: 14,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "0 0 8px 8px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "none",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {searchResults.slice(0, 10).map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => handleSearchSelect(hotspot)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#252525";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {/* Hotspot type indicator */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: typeToSolidColor(hotspot.type),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#ffffff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hotspot.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    {hotspot.type === "driver" ? "Driver" : "Impact"} • {hotspot.topic}
                  </div>
                </div>
                {/* Arrow icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
            {searchResults.length > 10 && (
              <div
                style={{
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#9ca3af",
                  textAlign: "center",
                }}
              >
                +{searchResults.length - 10} more results
              </div>
            )}
          </div>
        )}

        {/* No results message */}
        {isSearchFocused && searchQuery.trim() && searchResults.length === 0 && (
          <div
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "0 0 8px 8px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "none",
              padding: "16px 14px",
              fontSize: 14,
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            No hotspots found
          </div>
        )}
        </div>
      </div>

      {/* Full-screen menu overlay */}
      {isMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {/* Menu header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Eco Atlas Logo */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="18" cy="18" r="16" stroke="#4ade80" strokeWidth="1.5" fill="none" />
                <ellipse cx="18" cy="18" rx="16" ry="6" stroke="#4ade80" strokeWidth="1" fill="none" />
                <ellipse cx="18" cy="18" rx="6" ry="16" stroke="#4ade80" strokeWidth="1" fill="none" />
              </svg>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Eco Atlas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Menu content */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              padding: "40px 60px",
            }}
          >
            {/* Column 1: Hottest Stories */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Hottest Stories
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Arctic Ice Collapse 2026",
                  "Amazon Tipping Point",
                  "Coral Bleaching Crisis",
                  "Permafrost Methane Release",
                  "Sea Level Acceleration",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4ade80",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: 24,
                }}
              >
                View All Stories →
              </button>
            </div>

            {/* Column 2: Political Policies */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Political Policies
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Paris Agreement Updates",
                  "Carbon Tax Legislation",
                  "Green New Deal",
                  "EU Climate Law",
                  "Net Zero Commitments",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4ade80",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: 24,
                }}
              >
                View All Policies →
              </button>
            </div>

            {/* Column 3: Leading Solutions */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Leading Solutions
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Renewable Energy Tech",
                  "Carbon Capture",
                  "Sustainable Agriculture",
                  "Electric Transportation",
                  "Green Building",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4ade80",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: 24,
                }}
              >
                View All Solutions →
              </button>
            </div>

            {/* Column 4: Non Profit Support */}
            <div style={{ padding: "0 24px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Non Profit Support
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "350.org",
                  "Greenpeace",
                  "Sierra Club",
                  "WWF",
                  "Climate Reality Project",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4ade80",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: 24,
                }}
              >
                View All Organizations →
              </button>
            </div>
          </div>

          {/* Second row of categories */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              padding: "0 60px 40px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 40,
            }}
          >
            {/* Column 5: Take Action */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Take Action
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Carbon Footprint Calculator",
                  "Reduce Your Impact",
                  "Sustainable Living Guide",
                  "Contact Your Representatives",
                  "Join Local Groups",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 6: Data & Research */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Data & Research
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "IPCC Reports",
                  "NASA Climate Data",
                  "NOAA Statistics",
                  "Academic Research",
                  "Real-time Monitoring",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 7: By Region */}
            <div style={{ padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                By Region
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Africa",
                  "South America",
                  "Arctic & Antarctic",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 8: Industries */}
            <div style={{ padding: "0 24px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 24 }}>
                Industries
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Energy & Utilities",
                  "Transportation",
                  "Agriculture & Food",
                  "Manufacturing",
                  "Construction",
                  "Finance & Insurance",
                ].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar toggle button - shows when sidebar is hidden but hotspot is selected */}
      {!isPanelOpen && selectedHotspot && (
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 60,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            cursor: "pointer",
            transition: "background-color 0.15s, width 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#252525";
            e.currentTarget.style.width = "32px";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#1a1a1a";
            e.currentTarget.style.width = "24px";
          }}
          aria-label="Open sidebar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Overlay sidebar panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 20,
          transform: isPanelOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease-in-out",
          pointerEvents: isPanelOpen ? "auto" : "none",
        }}
      >
        {selectedHotspot && (
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
              <section>
                <h3 className="mb-2 text-base font-bold text-white">
                  Description
                </h3>
                <p className="mb-2 text-[15px] font-medium leading-snug text-white">
                  {selectedHotspot.story?.headline ??
                    selectedHotspot.title ??
                    "Story unavailable"}
                </p>
                <p className="text-sm leading-relaxed text-gray-300">
                  {selectedHotspot.story?.summary ??
                    selectedHotspot.summary ??
                    "Summary unavailable."}
                </p>
              </section>

              <div className="h-px bg-white/10" />

              <section>
                <h3 className="mb-2 text-base font-bold text-white">
                  {selectedHotspot.type === "driver"
                    ? "Climate Contribution"
                    : "Climate Impact"}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  {selectedHotspot.story?.climateImpact ??
                    "Global warming impacts are being assessed."}
                </p>
              </section>

              <div className="h-px bg-white/10" />

              <section>
                <h3 className="mb-2 text-base font-bold text-white">
                  Cause → Effect
                </h3>
                <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-gray-300">
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
                <>
                  <div className="h-px bg-white/10" />
                  <section>
                    <h3 className="mb-2 text-base font-bold text-white">
                      Scale & Context
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300">
                      {selectedHotspot.story.scaleContext}
                    </p>
                  </section>
                </>
              )}

              {selectedHotspot.story?.outlook && (
                <>
                  <div className="h-px bg-white/10" />
                  <section>
                    <h3 className="mb-2 text-base font-bold text-white">
                      Outlook
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300">
                      {selectedHotspot.story.outlook}
                    </p>
                  </section>
                </>
              )}
            </div>
          }
          data={(() => {
            if (loadingDetail) {
              return (
                <div className="animate-pulse rounded-md border border-white/10 bg-[#252525] p-3 text-sm text-gray-300">
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
                          className="rounded-lg border border-white/10 bg-[#252525] p-4 text-gray-100"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">
                            {metricTitle}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {metricMapping.description}
                          </div>
                          <div className="mt-3 text-sm text-gray-300">
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
                            className="mt-2 text-xs text-gray-300 transition hover:text-white"
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
          trends={
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Trend analysis for this hotspot will be available soon.
              </p>
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-sm text-gray-300">
                  This section will display historical trends, projections, and temporal patterns
                  for {selectedHotspot.name}.
                </p>
              </div>
            </div>
          }
          layers={
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Layer controls for this hotspot will be available soon.
              </p>
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-sm text-gray-300">
                  This section will allow you to toggle data layers, overlays, and visualizations
                  related to {selectedHotspot.name}.
                </p>
              </div>
            </div>
          }
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
              <ul className="space-y-2 text-sm text-gray-300">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-gray-500 transition hover:text-white hover:decoration-gray-400"
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
        )}
      </div>

      {/* Climate Clock Sidebar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 20,
          transform: isClimateClockOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease-in-out",
          pointerEvents: isClimateClockOpen ? "auto" : "none",
        }}
      >
        <aside
          style={{
            width: 420,
            maxWidth: "100%",
            height: "100%",
            paddingTop: 60,
            borderRight: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "#1a1a1a",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Climate Clock
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                Time remaining to limit warming to 1.5°C
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsClimateClockOpen(false)}
              style={{
                padding: "8px 12px",
                backgroundColor: "transparent",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          </div>

          {/* Main countdown display */}
          <div
            style={{
              padding: "24px 20px",
              background: "linear-gradient(180deg, rgba(239,68,68,0.1) 0%, transparent 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#ef4444",
                  marginBottom: 8,
                }}
              >
                Time Remaining
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "#ffffff",
                  letterSpacing: "0.02em",
                  textShadow: "0 0 30px rgba(239,68,68,0.3)",
                }}
              >
                {climateClock.remainingTime.years}y {climateClock.remainingTime.days}d
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  fontFamily: "monospace",
                  color: "#ef4444",
                  marginTop: 4,
                }}
              >
                {String(climateClock.remainingTime.hours).padStart(2, "0")}:
                {String(climateClock.remainingTime.minutes).padStart(2, "0")}:
                {String(climateClock.remainingTime.seconds).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Current Warming */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🌡</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Current Warming
                  </span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f97316" }}>
                  +{climateClock.currentWarming.toFixed(2)}°C
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  Above pre-industrial levels (1850-1900)
                </div>
              </div>

              {/* Remaining Carbon Budget */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Carbon Budget Remaining
                  </span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>
                  {climateClock.remainingBudgetGt.toFixed(1)} Gt CO₂
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  To stay below 1.5°C warming (50% chance)
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    marginTop: 12,
                    height: 6,
                    backgroundColor: "#3f3f3f",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(climateClock.remainingBudgetGt / CLIMATE_CLOCK_CONFIG.carbonBudgetStartGt) * 100}%`,
                      height: "100%",
                      backgroundColor: "#ef4444",
                      borderRadius: 3,
                      transition: "width 1s linear",
                    }}
                  />
                </div>
              </div>

              {/* Emissions Rate */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#252525",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🔥</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Global Emissions Rate
                  </span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#fb923c" }}>
                  {climateClock.emissionsRateGtPerYear} Gt CO₂/year
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  Current annual global emissions
                </div>
              </div>

              {/* What this means */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>
                  What does this mean?
                </div>
                <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, margin: 0 }}>
                  The Climate Clock shows the time remaining before the global carbon budget 
                  is exhausted. At current emission rates, we will exceed the carbon budget 
                  needed to limit warming to 1.5°C above pre-industrial levels. After this 
                  deadline, severe climate impacts become much more likely.
                </p>
              </div>

              {/* Sources */}
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                Data based on IPCC AR6 estimates. Carbon budget for 1.5°C with 50% probability.
                <br />
                Source: <a href="https://climateclock.world/" target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>climateclock.world</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

