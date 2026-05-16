"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

type WelcomeOverlayProps = {
  onStartExploring: () => void;
  onSeeDrivers: () => void;
  onDismiss: () => void;
  isDriverCtaDisabled?: boolean;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "96px 20px 112px",
  background:
    "radial-gradient(circle at 50% 42%, rgba(74, 222, 128, 0.22), rgba(2, 6, 23, 0.74) 46%, rgba(0, 0, 0, 0.9) 100%)",
  backdropFilter: "blur(4px)",
};

const cardStyle: CSSProperties = {
  position: "relative",
  width: "min(720px, 100%)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: 28,
  padding: "42px 34px 36px",
  overflow: "hidden",
  textAlign: "center",
  background:
    "linear-gradient(145deg, rgba(7, 18, 28, 0.94), rgba(3, 7, 18, 0.88))",
  boxShadow: "0 32px 90px rgba(0, 0, 0, 0.52)",
};

const glowStyle: CSSProperties = {
  position: "absolute",
  inset: "-45% 18% auto",
  height: 220,
  borderRadius: "999px",
  background: "rgba(74, 222, 128, 0.14)",
  filter: "blur(34px)",
  pointerEvents: "none",
};

const eyebrowStyle: CSSProperties = {
  position: "relative",
  marginBottom: 16,
  color: "#86efac",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  position: "relative",
  maxWidth: 640,
  margin: "0 auto",
  color: "#ffffff",
  fontSize: "clamp(32px, 5vw, 54px)",
  lineHeight: 1.02,
  fontWeight: 800,
  letterSpacing: "-0.045em",
};

const bodyStyle: CSSProperties = {
  position: "relative",
  maxWidth: 560,
  margin: "20px auto 0",
  color: "#cbd5e1",
  fontSize: 17,
  lineHeight: 1.65,
};

const actionsStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginTop: 30,
};

const primaryButtonStyle: CSSProperties = {
  minWidth: 176,
  border: "1px solid rgba(134, 239, 172, 0.78)",
  borderRadius: 999,
  padding: "13px 22px",
  color: "#03110a",
  background: "linear-gradient(135deg, #86efac, #4ade80)",
  boxShadow: "0 14px 30px rgba(74, 222, 128, 0.24)",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonBaseStyle: CSSProperties = {
  minWidth: 230,
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 999,
  padding: "13px 22px",
  color: "#f8fafc",
  background: "rgba(255, 255, 255, 0.07)",
  fontSize: 14,
  fontWeight: 700,
};

const skipButtonStyle: CSSProperties = {
  position: "absolute",
  top: 18,
  right: 18,
  zIndex: 1,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 999,
  padding: "7px 12px",
  color: "#cbd5e1",
  background: "rgba(255, 255, 255, 0.06)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export default function WelcomeOverlay({
  onStartExploring,
  onSeeDrivers,
  onDismiss,
  isDriverCtaDisabled = false,
}: WelcomeOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  const secondaryButtonStyle: CSSProperties = {
    ...secondaryButtonBaseStyle,
    opacity: isDriverCtaDisabled ? 0.48 : 1,
    cursor: isDriverCtaDisabled ? "not-allowed" : "pointer",
  };

  return (
    <div
      style={overlayStyle}
      role="presentation"
    >
      <section
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
      >
        <div style={glowStyle} />
        <button
          type="button"
          onClick={onDismiss}
          style={skipButtonStyle}
          aria-label="Dismiss welcome message"
        >
          Skip
        </button>

        <p style={eyebrowStyle}>EcoAtlas</p>
        <h1
          id="welcome-title"
          style={titleStyle}
        >
          See how climate change is reshaping Earth.
        </h1>
        <p
          id="welcome-description"
          style={bodyStyle}
        >
          Explore interactive hotspots, compare climate trends, and follow the
          real-world data behind each story.
        </p>

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={onStartExploring}
            style={primaryButtonStyle}
            autoFocus
          >
            Explore the globe
          </button>
          <button
            type="button"
            onClick={onSeeDrivers}
            disabled={isDriverCtaDisabled}
            style={secondaryButtonStyle}
          >
            View biggest climate drivers
          </button>
        </div>
      </section>
    </div>
  );
}
