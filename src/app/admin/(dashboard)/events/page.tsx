import Link from "next/link";
import { getUpcomingEvents, getPastEvents, shortenEventTitle } from "@/data/events";
import { getEventInfoOverride, getCmsEventData } from "@/lib/cms-store";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const upcoming = getUpcomingEvents();
  const past = getPastEvents().slice(0, 10);
  const all = [...upcoming, ...past];

  const [overrides, dataOverrides] = await Promise.all([
    Promise.all(
      all.map(async (e) => ({
        slug: e.slug,
        hasGraphicOverride: (await getEventInfoOverride(e.slug)) !== null,
      })),
    ),
    Promise.all(
      all.map(async (e) => ({
        slug: e.slug,
        hasDataOverride: (await getCmsEventData(e.slug)) !== null,
      })),
    ),
  ]);

  const graphicOverrideMap = new Map(overrides.map((o) => [o.slug, o.hasGraphicOverride]));
  const dataOverrideMap = new Map(dataOverrides.map((o) => [o.slug, o.hasDataOverride]));

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Events</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Edit event details or update social graphic templates.
        </p>
      </div>

      <EventSection
        title="Upcoming Events"
        events={upcoming}
        graphicOverrideMap={graphicOverrideMap}
        dataOverrideMap={dataOverrideMap}
      />
      {past.length > 0 && (
        <EventSection
          title="Recent Past Events"
          events={past}
          graphicOverrideMap={graphicOverrideMap}
          dataOverrideMap={dataOverrideMap}
        />
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  graphicOverrideMap,
  dataOverrideMap,
}: {
  title: string;
  events: ReturnType<typeof getUpcomingEvents>;
  graphicOverrideMap: Map<string, boolean>;
  dataOverrideMap: Map<string, boolean>;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
        {title}
      </h2>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
        {events.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">None.</p>
        ) : (
          events.map((evt) => {
            const hasGraphic = getEventGraphicRenderer(evt) !== null;
            const hasGraphicOverride = graphicOverrideMap.get(evt.slug) ?? false;
            const hasDataOverride = dataOverrideMap.get(evt.slug) ?? false;

            return (
              <div key={evt.slug} className="flex items-center gap-4 px-4 py-3">
                {/* Date badge */}
                <div className="shrink-0 text-center w-10">
                  <p className="text-xs text-gray-400 uppercase leading-none">
                    {evt.month?.slice(0, 3)}
                  </p>
                  <p className="text-lg font-bold text-gray-800 leading-tight">{evt.day}</p>
                </div>

                {/* Title + time */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {shortenEventTitle(evt.title)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{evt.startTime}</p>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasGraphic && (
                    <span
                      className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#eff6ff", color: "#1e40af" }}
                    >
                      Graphic
                    </span>
                  )}
                  {hasDataOverride && (
                    <span
                      className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#d1fae5", color: "#065f46" }}
                    >
                      Edited
                    </span>
                  )}
                  {hasGraphicOverride && (
                    <span
                      className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#fef3c7", color: "#92400e" }}
                    >
                      Custom graphic
                    </span>
                  )}
                </div>

                {/* Edit button */}
                <Link
                  href={`/admin/events/${evt.slug}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "#0C1B33" }}
                >
                  Edit
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
