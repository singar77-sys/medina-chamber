"use client";

import { useState } from "react";
import type { ChamberEvent } from "@/data/events";
import type { CmsEventData } from "@/lib/cms-store";

interface Props {
  slug: string;
  event: ChamberEvent;
  initialOverride: CmsEventData | null;
}

export function EventEditor({ slug, event, initialOverride }: Props) {
  const [override, setOverride] = useState<CmsEventData | null>(initialOverride);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [title, setTitle] = useState(override?.title ?? event.title);
  const [dateISO, setDateISO] = useState(override?.dateISO ?? event.dateISO);
  const [startTime, setStartTime] = useState(override?.startTime ?? event.startTime);
  const [endTime, setEndTime] = useState(override?.endTime ?? event.endTime);
  const [venue, setVenue] = useState(override?.venue ?? event.venue ?? "");
  const [locationDesc, setLocationDesc] = useState(
    override?.locationDesc ?? event.locationDesc ?? "",
  );
  const [street, setStreet] = useState(override?.street ?? event.street ?? "");
  const [city, setCity] = useState(override?.city ?? event.city ?? "");
  const [stateVal, setStateVal] = useState(override?.state ?? event.state ?? "");
  const [zip, setZip] = useState(override?.zip ?? event.zip ?? "");
  const [pricing, setPricing] = useState(override?.pricing ?? event.pricing ?? "");
  const [registerUrl, setRegisterUrl] = useState(
    override?.registerUrl ?? event.registerUrl ?? "",
  );
  const [contactName, setContactName] = useState(
    override?.contactName ?? event.contactName ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    override?.contactPhone ?? event.contactPhone ?? "",
  );

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    try {
      const data: CmsEventData = {
        title: title.trim() || undefined,
        dateISO: dateISO || undefined,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        venue: venue.trim() || undefined,
        locationDesc: locationDesc.trim() || undefined,
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: stateVal.trim() || undefined,
        zip: zip.trim() || undefined,
        pricing: pricing.trim() || undefined,
        registerUrl: registerUrl.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      };
      const res = await fetch("/api/admin/events/details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ slug, data }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { data: CmsEventData };
      setOverride(json.data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleReset() {
    if (
      !confirm(
        "Reset to scraped data? This removes all custom overrides for this event.",
      )
    )
      return;
    setStatus("saving");
    try {
      const res = await fetch(
        `/api/admin/events/details?slug=${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setOverride(null);
      setTitle(event.title);
      setDateISO(event.dateISO);
      setStartTime(event.startTime);
      setEndTime(event.endTime);
      setVenue(event.venue ?? "");
      setLocationDesc(event.locationDesc ?? "");
      setStreet(event.street ?? "");
      setCity(event.city ?? "");
      setStateVal(event.state ?? "");
      setZip(event.zip ?? "");
      setPricing(event.pricing ?? "");
      setRegisterUrl(event.registerUrl ?? "");
      setContactName(event.contactName ?? "");
      setContactPhone(event.contactPhone ?? "");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset");
    }
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cambridge";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Event Details</h2>
        {override ? (
          <span
            className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "#d1fae5", color: "#065f46" }}
          >
            Custom override active
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">Using scraped data</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <label className={labelCls}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Date / Times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Start Time</label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="8:30 AM"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Time</label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="10:00 AM"
              className={inputCls}
            />
          </div>
        </div>

        {/* Venue / Location note */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Venue</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Chamber office"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Location note</label>
            <input
              type="text"
              value={locationDesc}
              onChange={(e) => setLocationDesc(e.target.value)}
              placeholder="Suite A, second floor"
              className={inputCls}
            />
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <label className={labelCls}>Street</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>State</label>
            <input
              type="text"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>ZIP</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <label className={labelCls}>Pricing</label>
          <textarea
            value={pricing}
            onChange={(e) => setPricing(e.target.value)}
            rows={3}
            placeholder={"$30 per person\n$25 members"}
            className={`${inputCls} resize-none`}
          />
          <p className="text-xs text-gray-400 mt-0.5">
            One price per line. First line shown prominently.
          </p>
        </div>

        {/* Registration URL */}
        <div>
          <label className={labelCls}>Registration URL</label>
          <input
            type="url"
            value={registerUrl}
            onChange={(e) => setRegisterUrl(e.target.value)}
            placeholder="https://growthzone.com/..."
            className={inputCls}
          />
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={status === "saving"}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--color-oxford)" }}
            >
              {status === "saving" ? "Saving…" : "Save changes"}
            </button>
            {override && (
              <button
                onClick={handleReset}
                disabled={status === "saving"}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Reset to scraped
              </button>
            )}
          </div>
          {status === "saved" && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {status === "error" && (
            <span className="text-xs text-red-500">{errorMsg}</span>
          )}
        </div>
      </div>
    </div>
  );
}
