"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type TabKey = "story" | "data" | "trends" | "layers" | "sources";

type SidebarProps = {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeType?: "driver" | "impact";
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onClose?: () => void;
  story: ReactNode;
  data: ReactNode;
  trends: ReactNode;
  layers: ReactNode;
  sources: ReactNode;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "story", label: "Story" },
  { key: "data", label: "Data" },
  { key: "trends", label: "Trends" },
  { key: "layers", label: "Layers" },
  { key: "sources", label: "Sources" },
];

export default function Sidebar({
  title,
  subtitle,
  badgeLabel,
  badgeType = "impact",
  activeTab,
  onTabChange,
  onClose,
  story,
  data,
  trends,
  layers,
  sources,
}: SidebarProps) {
  const badgeColor = badgeType === "driver" ? "#ff6b6b" : "#69b3ff";
  return (
    <aside
      style={{
        width: 420,
        maxWidth: "100%",
        height: "100%",
        paddingTop: 60, // Space for the persistent header
        borderRight: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "#1a1a1a",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Tab navigation bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "#141414",
        }}
      >
        <nav style={{ display: "flex" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: activeTab === tab.key ? "#ffffff" : "#9ca3af",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #ffffff" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.color = "#9ca3af";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              padding: "12px 16px",
              color: "#9ca3af",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Collapse sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Title section */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "20px 24px",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
          {title}
        </h2>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
          {badgeLabel && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: badgeColor }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: badgeColor }} />
              {badgeLabel}
            </span>
          )}
          <span style={{ fontSize: 14, color: "#9ca3af" }}>{subtitle}</span>
        </div>
      </div>

      {/* Content area */}
      <ScrollArea className="flex-1" style={{ backgroundColor: "#1a1a1a" }}>
        <div style={{ padding: "20px 24px" }}>
          {activeTab === "story" && story}
          {activeTab === "data" && data}
          {activeTab === "trends" && trends}
          {activeTab === "layers" && layers}
          {activeTab === "sources" && sources}
        </div>
      </ScrollArea>
    </aside>
  );
}
