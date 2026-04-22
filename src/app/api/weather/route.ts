/**
 * Medina, OH live weather feed.
 *
 * Powers the site's time-aware theme (is day / is night) and the
 * MedinaAmbience landing effect (snow, rain, fog, thunderstorm).
 *
 * Data source: Open-Meteo — free, no API key, generous rate limits,
 * sub-second response. WMO weather codes are grouped into a handful
 * of render categories the client knows how to animate.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
// Cache the response at the edge for 15 minutes. Weather doesn't flip
// fast, and sharing a cached response across visitors keeps Open-Meteo
// happy and cold-starts quick.
export const revalidate = 900;

const MEDINA_LAT = 41.1381;
const MEDINA_LON = -81.8637;

// Open-Meteo WMO weather-code groupings. See
// https://open-meteo.com/en/docs#weathervariables
type Condition = "clear" | "cloudy" | "fog" | "rain" | "snow" | "thunder";

function codeToCondition(code: number): Condition {
  if (code === 0) return "clear";
  if (code === 1 || code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";         // drizzle / rain / freezing rain
  if (code >= 71 && code <= 77) return "snow";         // snow grains / snow fall
  if (code >= 80 && code <= 82) return "rain";         // rain showers
  if (code === 85 || code === 86) return "snow";       // snow showers
  if (code >= 95 && code <= 99) return "thunder";      // thunderstorms
  return "cloudy"; // unknown code → fall back to neutral
}

export interface MedinaWeather {
  condition: Condition;
  tempF: number | null;
  isDay: boolean;
  observedAt: string; // ISO string from Open-Meteo
  fetchedAt: string;  // our server timestamp
}

export async function GET() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(MEDINA_LAT));
  url.searchParams.set("longitude", String(MEDINA_LON));
  url.searchParams.set("current", "temperature_2m,weather_code,is_day");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "America/New_York");

  try {
    const res = await fetch(url.toString(), {
      // Next edge runtime honors revalidate; also explicitly tag so
      // ISR invalidates in 15 min windows.
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = (await res.json()) as {
      current: {
        time: string;
        temperature_2m: number;
        weather_code: number;
        is_day: 0 | 1;
      };
    };

    const payload: MedinaWeather = {
      condition: codeToCondition(data.current.weather_code),
      tempF: Math.round(data.current.temperature_2m),
      isDay: data.current.is_day === 1,
      observedAt: data.current.time,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        // Edge cache + browser cache (fresh 15 min, stale-while-revalidate 1h)
        "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch {
    // Failsafe: return a neutral "clear daytime" so the site still
    // renders without effects. Short cache so we retry soon.
    const fallback: MedinaWeather = {
      condition: "clear",
      tempF: null,
      isDay: true,
      observedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(fallback, {
      status: 200,
      headers: { "Cache-Control": "s-maxage=60" },
    });
  }
}
