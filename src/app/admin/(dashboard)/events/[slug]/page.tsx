import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/data/events";
import { getEventInfoOverride, getCmsEventData } from "@/lib/cms-store";
import { getTemplateForEventType } from "@/lib/graphic-template";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { getEventPhotos, getEventGraphicImage } from "@/lib/media-store";
import { EventEditor } from "@/components/admin/EventEditor";
import { GraphicPanel } from "@/components/admin/GraphicPanel";
import { EventPhotoUploader } from "@/components/admin/EventPhotoUploader";
import type { EventInfo } from "@/components/events/graphics/shared";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminEventPage({ params }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const [savedOverride, savedEventData, customTemplate, eventPhotos, graphicImageUrl] =
    await Promise.all([
      getEventInfoOverride(slug),
      getCmsEventData(slug),
      getTemplateForEventType(event.slug),
      getEventPhotos(slug),
      getEventGraphicImage(slug),
    ]);

  const Graphic = getEventGraphicRenderer(event);

  const baseInfo: EventInfo = {
    dayOfWeek: event.dayOfWeek,
    month: event.month,
    day: event.day,
    year: event.year,
    time: event.startTime,
    venue: event.venue,
    address: event.street ? `${event.street}, ${event.city}, ${event.state}` : undefined,
  };

  const currentInfo: EventInfo = savedOverride ?? baseInfo;
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <Link href="/admin/events" className="text-sm text-[#83BCA9] hover:underline">
          ← Events
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-3">{event.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {event.dayOfWeek}, {event.month} {event.day}, {event.year} · {event.startTime}–{event.endTime}
        </p>
      </div>

      {/* ── Event details editor ── */}
      <EventEditor
        slug={slug}
        event={event}
        initialOverride={savedEventData}
        adminToken={adminToken}
      />

      {/* ── Social graphic editor (client component — preview updates live) ── */}
      {Graphic || customTemplate || graphicImageUrl ? (
        <GraphicPanel
          event={event}
          adminToken={adminToken}
          initialInfo={currentInfo}
          hasSavedOverride={savedOverride !== null}
          customTemplate={customTemplate}
          initialGraphicImageUrl={graphicImageUrl}
        />
      ) : (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400">
          No social graphic template for this event type.{" "}
          <span className="text-gray-500">Upload a custom graphic below or build a template in</span>{" "}
          <Link href="/admin/graphic-templates" className="text-[#83BCA9] hover:underline">
            Graphic Templates
          </Link>
          .
        </div>
      )}

      {/* ── Event photo uploader ── */}
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-5">
        <EventPhotoUploader
          eventSlug={slug}
          eventTitle={event.title}
          adminToken={adminToken}
          initialPhotos={eventPhotos}
        />
      </div>
    </div>
  );
}
