import posthog from "posthog-js";

let hasInitialized = false;
let hasTriedInit = false;

type TrackProps = Record<string, string | number | boolean | null | undefined>;

const isBrowser = () => typeof window !== "undefined";

export const initAnalytics = () => {
  if (!isBrowser() || hasInitialized || hasTriedInit) return hasInitialized;
  hasTriedInit = true;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return false;

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: false,
  });

  hasInitialized = true;
  return true;
};

export const track = (event: string, properties?: TrackProps) => {
  if (!isBrowser()) return;
  if (!hasInitialized) {
    const didInit = initAnalytics();
    if (!didInit) return;
  }

  posthog.capture(event, properties);
};

