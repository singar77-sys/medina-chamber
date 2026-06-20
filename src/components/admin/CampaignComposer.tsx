"use client";

import { useEffect, useState } from "react";
import type { CampaignSegment } from "@/lib/db/schema";

export interface TierOption {
  value: string;
  label: string;
}

export interface CampaignData {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  htmlBody: string | null;
  segmentFilter: CampaignSegment | null;
  status: string;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  failedCount: number;
  sentAt: string | null;
}

interface Props {
  tierOptions: TierOption[];
  campaign?: CampaignData;
}

// Organization statuses worth emailing (the full enum also has "deleted").
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active members" },
  { value: "prospect", label: "Prospects" },
  { value: "courtesy", label: "Courtesy" },
  { value: "non_member", label: "Non-members" },
  { value: "inactive", label: "Inactive / lapsed" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "a draft",
  scheduled: "scheduled",
  sending: "sending",
  sent: "sent",
  sent_with_errors: "sent (with some delivery failures)",
  cancelled: "cancelled",
};

const OXFORD = "#0C1B33";
const inputClass =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

function sameSet(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export function CampaignComposer({ tierOptions, campaign }: Props) {
  const editable = !campaign || campaign.status === "draft" || campaign.status === "scheduled";
  const isSent =
    !!campaign && ["sent", "sending", "sent_with_errors"].includes(campaign.status);
  const isStuck = !!campaign && campaign.status === "sending";

  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [fromName, setFromName] = useState(campaign?.fromName ?? "");
  const [fromEmail, setFromEmail] = useState(campaign?.fromEmail ?? "");
  const [replyTo, setReplyTo] = useState(campaign?.replyTo ?? "");
  const [htmlBody, setHtmlBody] = useState(campaign?.htmlBody ?? "");

  const [tiers, setTiers] = useState<string[]>(campaign?.segmentFilter?.tiers ?? []);
  const [statuses, setStatuses] = useState<string[]>(campaign?.segmentFilter?.statuses ?? ["active"]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetErr, setResetErr] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countErr, setCountErr] = useState("");

  // Unsaved-changes guard: "Send now" blasts the PERSISTED campaign, so it must
  // be disabled while the form differs from what's saved (else the confirmation
  // dialog would describe edits the server won't actually send).
  const dirty =
    !!campaign &&
    (name.trim() !== campaign.name ||
      subject.trim() !== campaign.subject ||
      (fromName.trim() || "") !== campaign.fromName ||
      (fromEmail.trim() || "") !== campaign.fromEmail ||
      (replyTo.trim() || null) !== (campaign.replyTo ?? null) ||
      (htmlBody || null) !== (campaign.htmlBody ?? null) ||
      !sameSet(tiers, campaign.segmentFilter?.tiers ?? []) ||
      !sameSet(statuses, campaign.segmentFilter?.statuses ?? ["active"]));

  function authFetch(url: string, method: string, body?: unknown) {
    return fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function currentSegment(): CampaignSegment {
    return { tiers, statuses };
  }

  async function fetchCount(): Promise<number | null> {
    setCountLoading(true);
    setCountErr("");
    try {
      const res = await authFetch("/api/admin/campaigns/preview", "POST", currentSegment());
      if (!res.ok) {
        setCountErr("Couldn't load the recipient count.");
        return null;
      }
      const { count: c } = (await res.json()) as { count: number };
      setCount(c);
      return c;
    } catch {
      setCountErr("Couldn't load the recipient count.");
      return null;
    } finally {
      setCountLoading(false);
    }
  }

  // Auto-preview the audience once on mount so the count shows without a click.
  useEffect(() => {
    void fetchCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(list: string[], value: string, on: boolean): string[] {
    return on ? [...list, value] : list.filter((v) => v !== value);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    const body = {
      name: name.trim(),
      subject: subject.trim(),
      fromName: fromName.trim() || undefined,
      fromEmail: fromEmail.trim() || undefined,
      replyTo: replyTo.trim() || null,
      htmlBody: htmlBody || null,
      segmentFilter: currentSegment(),
    };
    const url = campaign ? `/api/admin/campaigns/${campaign.id}` : "/api/admin/campaigns";
    try {
      const res = await authFetch(url, campaign ? "PATCH" : "POST", body);
      if (res.ok) {
        const { campaign: saved } = (await res.json()) as { campaign: { id: string } };
        window.location.href = `/admin/campaigns/${saved.id}`;
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveErr(d.error ?? "Failed to save campaign.");
        setSaving(false);
      }
    } catch {
      setSaveErr("Connection error. Please try again.");
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!campaign) return;
    setSendErr("");
    if (dirty) {
      setSendErr("Save your changes before sending.");
      return;
    }
    if (!campaign.htmlBody || !campaign.htmlBody.trim()) {
      setSendErr("This campaign has no email body. Add one and save before sending.");
      return;
    }
    const n = count ?? (await fetchCount());
    if (n === null) {
      setSendErr("Couldn't determine the recipient count. Refresh and try again.");
      return;
    }
    const msg =
      n === 0
        ? "This segment currently matches 0 recipients. Send anyway?"
        : `Send "${campaign.subject}" to ${n} recipient${n === 1 ? "" : "s"}? This cannot be undone.`;
    if (!confirm(msg)) return;

    setSending(true);
    try {
      const res = await authFetch(`/api/admin/campaigns/${campaign.id}/send`, "POST");
      if (res.ok) {
        window.location.reload();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setSendErr(d.error ?? "Failed to send campaign.");
        setSending(false);
      }
    } catch {
      setSendErr("Connection error. Please try again.");
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!campaign) return;
    if (!confirm(`Delete draft "${campaign.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/admin/campaigns/${campaign.id}`, "DELETE");
      if (res.ok) {
        window.location.href = "/admin/campaigns";
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveErr(d.error ?? "Failed to delete campaign.");
        setDeleting(false);
      }
    } catch {
      setSaveErr("Connection error. Please try again.");
      setDeleting(false);
    }
  }

  async function handleReset() {
    if (!campaign) return;
    if (
      !confirm(
        "Reset this stuck send? Already-delivered recipients are kept; if any were reached it becomes “sent with errors” and can't be re-sent.",
      )
    )
      return;
    setResetting(true);
    setResetErr("");
    try {
      const res = await authFetch(`/api/admin/campaigns/${campaign.id}/reset`, "POST");
      if (res.ok) {
        window.location.reload();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setResetErr(d.error ?? "Reset failed.");
        setResetting(false);
      }
    } catch {
      setResetErr("Connection error. Please try again.");
      setResetting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {isSent && campaign && <StatsPanel campaign={campaign} />}

      {/* Campaign details */}
      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Campaign details</h2>

        <div>
          <label htmlFor="c-name" className={labelClass}>Internal name</label>
          <input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editable}
            required
            placeholder="e.g. May member newsletter"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="c-subject" className={labelClass}>Subject line</label>
          <input
            id="c-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!editable}
            required
            placeholder="What recipients see in their inbox"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-from-name" className={labelClass}>From name</label>
            <input
              id="c-from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              disabled={!editable}
              placeholder="Greater Medina Chamber"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-from-email" className={labelClass}>From email</label>
            <input
              id="c-from-email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={!editable}
              type="email"
              placeholder="news@medinaohchamber.com"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="c-reply-to" className={labelClass}>Reply-to (optional)</label>
          <input
            id="c-reply-to"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            disabled={!editable}
            type="email"
            placeholder="info@medinaohchamber.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="c-html-body" className={labelClass}>Email body (HTML)</label>
          <textarea
            id="c-html-body"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            disabled={!editable}
            rows={12}
            placeholder="<h1>Hello!</h1><p>News from the chamber…</p>"
            className={`${inputClass} font-mono text-xs`}
          />
          <p className="text-xs text-gray-400 mt-1">
            A footer with the chamber address and a one-click unsubscribe link is added automatically.
          </p>
        </div>
      </section>

      {/* Segment builder */}
      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Who gets this?</h2>

        <fieldset className="border-0 p-0 m-0">
          <legend className={labelClass}>Member status</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {STATUS_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={statuses.includes(s.value)}
                  onChange={(e) => setStatuses(toggle(statuses, s.value, e.target.checked))}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0 m-0">
          <legend className={labelClass}>Membership tier (optional — leave empty for all tiers)</legend>
          {tierOptions.length === 0 ? (
            <p className="text-xs text-gray-400">No active tiers found.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {tierOptions.map((t) => (
                <label key={t.value} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={tiers.includes(t.value)}
                    onChange={(e) => setTiers(toggle(tiers, t.value, e.target.checked))}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchCount()}
            disabled={countLoading}
            className="text-xs font-medium underline disabled:opacity-50"
            style={{ color: OXFORD }}
          >
            {countLoading ? "Counting…" : "Refresh recipient count"}
          </button>
          {count !== null && !countErr && (
            <p className="text-sm text-gray-700">
              Reaches <span className="font-semibold" style={{ color: OXFORD }}>{count}</span>{" "}
              recipient{count === 1 ? "" : "s"}.
            </p>
          )}
          {countErr && (
            <p role="alert" className="text-sm text-red-600">{countErr}</p>
          )}
        </div>
      </section>

      {saveErr && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {saveErr}
        </p>
      )}
      {sendErr && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {sendErr}
        </p>
      )}

      {editable ? (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: OXFORD }}
          >
            {saving ? "Saving…" : campaign ? "Save changes" : "Save draft"}
          </button>

          {campaign && (
            <>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || saving || dirty}
                title={dirty ? "Save your changes before sending" : undefined}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: "#047857" }}
              >
                {sending ? "Sending…" : "Send now"}
              </button>
              {dirty && <span className="text-xs text-gray-400">Save before sending</span>}

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving || sending}
                aria-label={`Delete draft ${campaign.name}`}
                className="ml-auto text-xs text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete draft"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            This campaign is {STATUS_LABEL[campaign!.status] ?? campaign!.status} and can no longer be edited.
          </p>

          {isStuck && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-sm text-amber-800">
                Stuck on &ldquo;sending&rdquo;? A send that&apos;s been running for over 15 minutes has likely
                stalled. Resetting recovers it — already-delivered recipients are kept.
              </p>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="text-sm font-medium text-amber-900 underline disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset stuck send"}
              </button>
              {resetErr && <p role="alert" className="text-sm text-red-600">{resetErr}</p>}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function StatsPanel({ campaign }: { campaign: CampaignData }) {
  const pct = (n: number) => (campaign.sentCount > 0 ? Math.round((n / campaign.sentCount) * 100) : 0);
  const stats = [
    { label: "Recipients", value: campaign.recipientCount },
    { label: "Sent", value: campaign.sentCount },
    { label: "Failed", value: campaign.failedCount },
    { label: "Opened", value: `${campaign.openCount} (${pct(campaign.openCount)}%)` },
    { label: "Clicked", value: `${campaign.clickCount} (${pct(campaign.clickCount)}%)` },
    { label: "Bounced", value: campaign.bounceCount },
    { label: "Unsubscribed", value: campaign.unsubscribeCount },
  ];
  return (
    <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Results{campaign.sentAt ? ` · sent ${new Date(campaign.sentAt).toLocaleString()}` : ""}
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
