import { track as vercelTrack } from "@vercel/analytics";

type TrackProps = Record<string, string | number | boolean | null | undefined>;

export type HotspotAnalyticsSource = "globe" | "search" | "sidebar_toggle" | "welcome_drivers";

export type HotspotAnalyticsInput = {
  id: string;
  name: string;
  type: "driver" | "impact";
  severity: number;
};

type HotspotAnalyticsProps = {
  hotspot_id: string;
  hotspot_name: string;
  hotspot_type: "driver" | "impact";
  severity: number;
  source?: HotspotAnalyticsSource;
};

type AnalyticsEventProperties = {
  globe_loaded: {
    hotspot_count?: number;
  };
  hotspot_selected: HotspotAnalyticsProps;
  panel_opened: HotspotAnalyticsProps;
  panel_closed: Omit<HotspotAnalyticsProps, "source">;
  tab_changed: Omit<HotspotAnalyticsProps, "source"> & {
    tab: "story" | "data" | "trends" | "layers" | "sources";
  };
  source_clicked: Omit<HotspotAnalyticsProps, "source"> & {
    source_label: string;
    source_domain: string;
  };
  search_opened: {
    hotspot_count: number;
  };
  search_result_selected: HotspotAnalyticsProps & {
    result_count: number;
  };
  climate_clock_opened: undefined;
  menu_opened: undefined;
  timeline_year_changed: {
    year: number;
  };
  hotspots_load_failed: {
    status?: number;
  };
  hotspot_detail_load_failed: {
    hotspot_id: string;
    status?: number;
  };
  welcome_viewed: undefined;
  welcome_start_clicked: undefined;
  welcome_drivers_clicked: {
    available: boolean;
    hotspot_id?: string;
    hotspot_name?: string;
    severity?: number;
  };
  welcome_dismissed: {
    method: "close" | "start" | "drivers";
  };
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;

type AnalyticsPropertiesFor<Event extends AnalyticsEventName> =
  AnalyticsEventProperties[Event] extends undefined
    ? undefined
    : AnalyticsEventProperties[Event];

export const toHotspotAnalyticsProps = (
  hotspot: HotspotAnalyticsInput,
  source?: HotspotAnalyticsSource
): HotspotAnalyticsProps => ({
  hotspot_id: hotspot.id,
  hotspot_name: hotspot.name,
  hotspot_type: hotspot.type,
  severity: hotspot.severity,
  source,
});

export const track = <Event extends AnalyticsEventName>(
  event: Event,
  properties?: AnalyticsPropertiesFor<Event>
) => {
  vercelTrack(event, properties as TrackProps | undefined);
};

export const trackHotspotEvent = (
  event: "hotspot_selected" | "panel_opened",
  hotspot: HotspotAnalyticsInput,
  source: HotspotAnalyticsSource
) => {
  track(event, toHotspotAnalyticsProps(hotspot, source));
};

