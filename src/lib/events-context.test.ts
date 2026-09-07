import { describe, expect, it, vi } from "vitest";

/**
 * The bug this file pins down: the bot told a visitor there were no November
 * events. It was not hallucinating — it was reading a block that said
 * "UPCOMING CHAMBER EVENTS (live from calendar, 10 scheduled)" and contained
 * only the ten soonest, which ran out in mid-October. Four real November events
 * sat just past the cut, and the chamber's own footer said 28 upcoming.
 *
 * So there are two properties here, and the second matters as much as the
 * first: send the whole calendar, and never label a subset as the calendar. A
 * truncated list that ADMITS it is truncated produces "not in the list I was
 * given"; one that claims completeness produces "there are none".
 *
 * The calendar is mocked so these assertions are pinned to a known set of
 * events instead of whatever the nightly scrape produced. The Eastern-day
 * filter is the real one from src/data/events.ts: the effective-event read
 * model is stubbed down to its Redis-free core (upcomingFrom over the fixture)
 * so the boundary case below exercises the real timezone code, not a mock of it.
 */

function evt(over: Record<string, unknown>) {
  return {
    eventId: "e",
    title: "Chamber Chat",
    dayOfWeek: "Thursday",
    year: 2026,
    startTime: "8:00 AM",
    endTime: "9:00 AM",
    dateString: "",
    location: "",
    locationDesc: "",
    street: "",
    city: "Medina",
    state: "OH",
    zip: "44256",
    pricing: "",
    image: "",
    registerUrl: "",
    contactName: "",
    contactPhone: "",
    detailUrl: "",
    scrapedAt: "",
    ...over,
  };
}

// 16 events: the ten in September/October that the old cap showed, the four
// November ones it hid, one already past, and one the scraper could not date.
// December is deliberately empty — that is the legitimately-empty month.
vi.mock("@/data/events.json", () => ({
  default: {
    generatedAt: "2026-09-01T00:00:00Z",
    totalEvents: 16,
    events: [
      evt({ slug: "sep-3", title: "Member Meeting", dateISO: "2026-09-03", month: "September", day: 3 }),
      evt({ slug: "sep-8", title: "Compass Program", dateISO: "2026-09-08", month: "September", day: 8 }),
      evt({ slug: "sep-15", title: "Safety Council September", dateISO: "2026-09-15", month: "September", day: 15 }),
      evt({ slug: "sep-16", title: "Networking WOW September", dateISO: "2026-09-16", month: "September", day: 16 }),
      evt({ slug: "sep-22", title: "Business Brew September", dateISO: "2026-09-22", month: "September", day: 22 }),
      evt({ slug: "sep-25", title: "Chamber Chat September", dateISO: "2026-09-25", month: "September", day: 25 }),
      evt({ slug: "oct-6", title: "Member Meeting October", dateISO: "2026-10-06", month: "October", day: 6 }),
      evt({ slug: "oct-8", title: "Raising the Bar", dateISO: "2026-10-08", month: "October", day: 8 }),
      evt({ slug: "oct-14", title: "Business Brew October", dateISO: "2026-10-14", month: "October", day: 14 }),
      evt({ slug: "oct-20", title: "Safety Council October", dateISO: "2026-10-20", month: "October", day: 20 }),
      // --- everything below here was invisible to the bot under the old cap ---
      evt({ slug: "nov-12", title: "Business Brew November", dateISO: "2026-11-12", month: "November", day: 12 }),
      evt({ slug: "nov-17", title: "Safety Council November", dateISO: "2026-11-17", month: "November", day: 17 }),
      evt({ slug: "nov-18", title: "Networking WOW November", dateISO: "2026-11-18", month: "November", day: 18 }),
      evt({ slug: "nov-20", title: "Chamber Chat November", dateISO: "2026-11-20", month: "November", day: 20 }),
      evt({ slug: "past", title: "Already Happened", dateISO: "2026-08-01", month: "August", day: 1 }),
      evt({ slug: "undated", title: "Date TBD", dateISO: "", month: "", day: 0 }),
    ],
  },
}));

// The effective-event model wraps a bare Upstash read in unstable_cache, which
// needs a Next request scope. Stub the read, keep the real Eastern filter.
vi.mock("@/lib/events-effective", async () => {
  const { events, upcomingFrom } = await import("@/data/events");
  return {
    getEffectiveUpcomingEvents: vi.fn(async (now: Date = new Date()) =>
      upcomingFrom(events, now).sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    ),
  };
});

const { formatEventsForPrompt, buildEventsPrompt } = await import("./events-context");
const { getEffectiveUpcomingEvents } = await import("@/lib/events-effective");
type ChamberEvent = Parameters<typeof buildEventsPrompt>[0][number];

// 03:30 UTC on Sep 4 is 23:30 ET on Sep 3 — the boundary where a UTC-based
// filter drops a same-day event hours early. This project has shipped that bug.
const LATE_ON_SEP_3 = new Date("2026-09-04T03:30:00Z");
const MID_SEP_3 = new Date("2026-09-03T16:00:00Z");

function bullets(out: string): string[] {
  return out.split("\n").filter((l) => l.startsWith("- "));
}

describe("formatEventsForPrompt", () => {
  it("includes November events that sat past the old ten-event cap", async () => {
    // The exact regression: "What events are scheduled in November 2026?"
    const out = await formatEventsForPrompt(MID_SEP_3);
    for (const title of [
      "Business Brew November",
      "Safety Council November",
      "Networking WOW November",
      "Chamber Chat November",
    ]) {
      expect(out).toContain(title);
    }
  });

  it("sends every upcoming event, not the first ten", async () => {
    const out = await formatEventsForPrompt(MID_SEP_3);
    expect(bullets(out)).toHaveLength(14);
    expect(out).not.toContain("Already Happened");
    expect(out).not.toContain("Date TBD");
  });

  it("tells the model the list is complete, and how complete", async () => {
    // Without this the model has no basis to say "nothing is scheduled" and
    // no basis to refuse to — the old header asserted a count that was a cap.
    const out = await formatEventsForPrompt(MID_SEP_3);
    expect(out).toContain("COMPLETE CALENDAR");
    expect(out).toContain("all 14 events");
    expect(out).toContain("This IS the whole upcoming calendar");
  });

  it("carries the year on every line, so a month question is unambiguous", async () => {
    // The calendar runs into the next year (Safety Council meets monthly
    // through the following June). "Tue, January 19" alone is a coin flip.
    const out = await formatEventsForPrompt(MID_SEP_3);
    for (const line of bullets(out)) expect(line).toMatch(/, 20\d{2}:/);
  });

  it("orders soonest first and links each event to its chamber page", async () => {
    const out = await formatEventsForPrompt(MID_SEP_3);
    const lines = bullets(out);
    expect(lines[0]).toContain("Member Meeting");
    expect(lines[lines.length - 1]).toContain("Chamber Chat November");
    expect(lines[0]).toContain("[Details & Registration](https://medinachamber.com/events/sep-3)");
  });

  it("leaves a legitimately empty month simply absent from a complete list", async () => {
    // December has no events. The block must not invent one, and must not
    // hedge either — the completeness statement is what lets the bot answer.
    const out = await formatEventsForPrompt(MID_SEP_3);
    expect(out).not.toContain("December");
    expect(out).toContain("nothing of that kind is currently scheduled");
  });

  it("still shows a same-day event at 23:30 Eastern", async () => {
    // Shares the events pages' own Eastern filter precisely so the bot and the
    // site cannot disagree about whether today's event is still on.
    const out = await formatEventsForPrompt(LATE_ON_SEP_3);
    expect(out).toContain("Member Meeting");
    expect(bullets(out)).toHaveLength(14);
    // And the header is measured against the Eastern day, not the UTC one.
    expect(out).toContain("2026-09-03");
    expect(out).not.toContain("2026-09-04 (Eastern)");
  });

  it("drops the event once the Eastern day has actually rolled over", async () => {
    const out = await formatEventsForPrompt(new Date("2026-09-04T16:00:00Z"));
    expect(out).not.toContain("Member Meeting |");
    expect(bullets(out)).toHaveLength(13);
  });
});

describe("degrading when the CMS override read fails", () => {
  it("falls back to the scraped calendar instead of failing the chat turn", async () => {
    // Overrides are additive corrections on top of the scrape, so losing them
    // costs freshness, not events. The caller is a chat request that reaches
    // this before its own try/catch — throwing here 500s every turn.
    vi.mocked(getEffectiveUpcomingEvents).mockRejectedValueOnce(
      new Error("upstash unreachable"),
    );
    const out = await formatEventsForPrompt(MID_SEP_3);
    expect(bullets(out)).toHaveLength(14);
    expect(out).toContain("Business Brew November");
  });
});

/**
 * The completeness HEADER, tested directly. formatEventsForPrompt above always
 * runs under the cap, so every test through it takes the `complete` branch —
 * which leaves the PARTIAL branch, the entire safety net for "never label a
 * subset as the calendar", with no coverage at all. That branch is what stands
 * between the bot and a repeat of the November answer if the calendar ever
 * crosses MAX_EVENTS_IN_PROMPT (a duplicating scraper is exactly the scenario
 * the cap is described as guarding), so it gets its own case.
 */
function calendar(n: number): ChamberEvent[] {
  // Unique, ascending dates across three months of 2027 so "soonest first" and
  // the boundary date in the PARTIAL header are both unambiguous.
  return Array.from({ length: n }, (_, i) => {
    const month = String(Math.floor(i / 28) + 1).padStart(2, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    return evt({
      slug: `gen-${i + 1}`,
      title: `Generated Event ${i + 1}`,
      dateISO: `2027-${month}-${day}`,
      month: "January",
      day: i + 1,
    }) as unknown as ChamberEvent;
  });
}

describe("buildEventsPrompt completeness wording", () => {
  it("claims completeness only when every upcoming event is in the list", () => {
    const out = buildEventsPrompt(calendar(60), "2026-09-07");
    expect(bullets(out)).toHaveLength(60);
    expect(out).toContain("COMPLETE CALENDAR");
    expect(out).toContain("all 60 events");
    expect(out).toContain("This IS the whole upcoming calendar");
    // The licence to answer "nothing of that kind is scheduled" is the whole
    // point of the complete branch, and it must not leak into the other one.
    expect(out).toContain("nothing of that kind is currently scheduled");
    expect(out).not.toContain("PARTIAL");
  });

  it("tells the model the list is a subset once the calendar outgrows the cap", () => {
    const events = calendar(61);
    const out = buildEventsPrompt(events, "2026-09-07");

    // Sixty shown, sixty-one real — and the header says both numbers rather
    // than asserting the shown count as the calendar, which is exactly the lie
    // the old "(live from calendar, 10 scheduled)" header told.
    expect(bullets(out)).toHaveLength(60);
    expect(out).toContain("PARTIAL LIST");
    expect(out).toContain("the 60 soonest of 61");
    expect(out).toContain("This is a SUBSET, not the whole calendar");

    // The 61st event is genuinely missing, so the model must be told to say so
    // rather than to conclude it does not exist.
    expect(out).not.toContain("Generated Event 61");
    expect(out).toContain("never say no such event exists");
    expect(out).toContain("https://medinachamber.com/events");

    // And the boundary it names is the last event SHOWN, so "anything after
    // this date is not in your list" is true rather than off by one.
    expect(out).toContain(`For anything after ${events[59].dateISO}`);

    // No completeness claim survives into the partial branch.
    expect(out).not.toContain("COMPLETE CALENDAR");
    expect(out).not.toContain("This IS the whole upcoming calendar");
    expect(out).not.toContain("nothing of that kind is currently scheduled");
  });

  it("prints only the times a record actually has", () => {
    // Date-only records (enrollment deadlines, the Compass cohort window) get
    // no time at all; a HALF-populated one used to print "8:00 AM–", which
    // reads as a dropped field rather than as an open-ended event.
    const out = buildEventsPrompt(
      [
        evt({ slug: "start-only", title: "Start Only", dateISO: "2027-01-05", month: "January", day: 5, endTime: "" }),
        evt({ slug: "no-times", title: "No Times", dateISO: "2027-01-06", month: "January", day: 6, startTime: "", endTime: "" }),
      ] as unknown as ChamberEvent[],
      "2026-09-07",
    );
    const lines = bullets(out);
    expect(lines[0]).toContain("8:00 AM");
    expect(lines[0]).not.toContain("8:00 AM–");
    expect(lines[1]).not.toContain("–");
  });

  it("clips a long pricing blob at a word boundary and marks the cut", () => {
    // The real calendar produced lines ending "however, completion o" and
    // "Refunds will b" — an abbreviation that reads as corrupted data, now
    // repeated across the whole calendar rather than ten events.
    const out = buildEventsPrompt(
      [
        evt({ slug: "wordy", title: "Wordy", dateISO: "2027-01-08", month: "January", day: 8, pricing: "cancellation ".repeat(20) }),
        evt({ slug: "short", title: "Short", dateISO: "2027-01-09", month: "January", day: 9, pricing: "Members $25 · Guests $35" }),
      ] as unknown as ChamberEvent[],
      "2026-09-07",
    );
    const [wordy, short] = bullets(out);
    expect(wordy).toContain("cancellation…");
    expect(wordy).not.toContain("cancellatio |");
    // Short pricing is left exactly as it is — no ellipsis on an uncut value.
    expect(short).toContain("Members $25 · Guests $35");
    expect(short).not.toContain("…");
  });

  it("sorts whatever the caller hands it before taking the soonest N", () => {
    // "The soonest 60" has to hold even if the read model's ordering changes;
    // nothing in its return type promises sorted output.
    const shuffled = [...calendar(61)].reverse();
    const out = buildEventsPrompt(shuffled, "2026-09-07");
    expect(bullets(out)[0]).toContain("Generated Event 1");
    expect(out).not.toContain("Generated Event 61");
  });
});

describe("formatEventsForPrompt with an empty calendar", () => {
  it("refuses to assert that the chamber has no events", async () => {
    // An empty feed is far likelier to be a scrape failure than a chamber that
    // scheduled nothing. Answering "there are no events" from missing data is
    // the same failure as answering it from a truncated list.
    vi.resetModules();
    vi.doMock("@/data/events.json", () => ({
      default: { generatedAt: "", totalEvents: 0, events: [] },
    }));
    vi.doMock("@/lib/events-effective", () => ({
      getEffectiveUpcomingEvents: vi.fn(async () => []),
    }));
    const { formatEventsForPrompt: empty } = await import("./events-context");

    const out = await empty(MID_SEP_3);
    expect(out).toContain("Do NOT tell anyone there are no chamber events");
    expect(out).toContain("https://medinachamber.com/events");
    expect(bullets(out)).toHaveLength(0);
  });
});
