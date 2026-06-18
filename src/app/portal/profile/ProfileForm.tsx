"use client";

/**
 * ProfileForm — client island on the otherwise-server /portal/profile page.
 *
 * Holds the editable contact + (for primary contacts) org-listing fields, then
 * POSTs them to /api/portal/profile. The route re-validates and re-authorizes
 * everything server-side; this form only shapes the request and surfaces the
 * result. Org fields are hidden for non-primary members (the route would 403
 * them anyway).
 */

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

export interface ProfileFields {
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  orgPhone: string;
  orgEmail: string;
  websiteUrl: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
}

const INPUT_CLASS = `
  w-full px-f13 py-f8
  bg-bg-secondary border border-border-primary
  rounded-[var(--radius-sm)]
  text-body-sm text-text-primary
  placeholder:text-text-tertiary
  focus:outline-none focus:border-cambridge
  focus-visible:ring-2 focus-visible:ring-cambridge/40
  transition-colors disabled:opacity-50
`;

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-body-sm font-bold text-text-primary mb-f5"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        maxLength={300}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
      <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function ProfileForm({
  initial,
  isPrimary,
  loginEmail,
}: {
  initial: ProfileFields;
  isPrimary: boolean;
  loginEmail: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFields>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  function update<K extends keyof ProfileFields>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear any prior success/error banner once the member starts editing again.
    if (status !== "idle") {
      setStatus("idle");
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    // Contact fields always; org fields only when the member is the primary
    // contact (the server enforces this regardless of what we send).
    const body: Record<string, string> = {
      firstName: form.firstName,
      lastName: form.lastName,
      title: form.title,
      phone: form.phone,
    };
    if (isPrimary) {
      Object.assign(body, {
        orgPhone: form.orgPhone,
        orgEmail: form.orgEmail,
        websiteUrl: form.websiteUrl,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
        facebook: form.facebook,
        twitter: form.twitter,
        instagram: form.instagram,
        linkedin: form.linkedin,
        youtube: form.youtube,
      });
    }

    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus("saved");
        router.refresh(); // re-render the server page with the saved values
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not save. Please try again.");
      setStatus("error");
    } catch {
      setError("Connection error. Please try again.");
      setStatus("error");
    }
  }

  const saving = status === "saving";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Your details (always editable) ──────────────────────────────────── */}
      <Card title="Your details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="First name"
            value={form.firstName}
            onChange={(v) => update("firstName", v)}
            autoComplete="given-name"
            required
            disabled={saving}
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChange={(v) => update("lastName", v)}
            autoComplete="family-name"
            required
            disabled={saving}
          />
        </div>
        <Field
          label="Title"
          value={form.title}
          onChange={(v) => update("title", v)}
          placeholder="Owner, Manager, …"
          autoComplete="organization-title"
          disabled={saving}
        />
        <Field
          label="Direct phone"
          value={form.phone}
          onChange={(v) => update("phone", v)}
          type="tel"
          autoComplete="tel"
          disabled={saving}
        />

        {/* Login email is read-only — it's the identity behind the magic link. */}
        <div>
          <label
            htmlFor="profile-login-email"
            className="block text-body-sm font-bold text-text-primary mb-f5"
          >
            Login email
          </label>
          <input
            id="profile-login-email"
            type="email"
            value={loginEmail}
            disabled
            readOnly
            className={INPUT_CLASS}
          />
          <p className="text-caption text-text-tertiary mt-f5">
            This is your sign-in email. Contact the chamber to change it.
          </p>
        </div>
      </Card>

      {/* ── Business listing (primary contact only) ─────────────────────────── */}
      {isPrimary ? (
        <Card title="Business listing">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Business phone"
              value={form.orgPhone}
              onChange={(v) => update("orgPhone", v)}
              type="tel"
              disabled={saving}
            />
            <Field
              label="Business email"
              value={form.orgEmail}
              onChange={(v) => update("orgEmail", v)}
              type="email"
              disabled={saving}
            />
          </div>
          <Field
            label="Website"
            value={form.websiteUrl}
            onChange={(v) => update("websiteUrl", v)}
            type="url"
            placeholder="yourbusiness.com"
            disabled={saving}
          />
          <Field
            label="Address"
            value={form.address1}
            onChange={(v) => update("address1", v)}
            autoComplete="address-line1"
            disabled={saving}
          />
          <Field
            label="Address line 2"
            value={form.address2}
            onChange={(v) => update("address2", v)}
            autoComplete="address-line2"
            placeholder="Suite, unit, etc. (optional)"
            disabled={saving}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field
              label="City"
              value={form.city}
              onChange={(v) => update("city", v)}
              autoComplete="address-level2"
              disabled={saving}
            />
            <Field
              label="State"
              value={form.state}
              onChange={(v) => update("state", v)}
              autoComplete="address-level1"
              disabled={saving}
            />
            <Field
              label="ZIP"
              value={form.zip}
              onChange={(v) => update("zip", v)}
              autoComplete="postal-code"
              disabled={saving}
            />
          </div>

          <div className="pt-2">
            <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-3">
              Social links
            </p>
            <div className="space-y-4">
              <Field
                label="Facebook"
                value={form.facebook}
                onChange={(v) => update("facebook", v)}
                disabled={saving}
              />
              <Field
                label="Instagram"
                value={form.instagram}
                onChange={(v) => update("instagram", v)}
                disabled={saving}
              />
              <Field
                label="LinkedIn"
                value={form.linkedin}
                onChange={(v) => update("linkedin", v)}
                disabled={saving}
              />
              <Field
                label="X / Twitter"
                value={form.twitter}
                onChange={(v) => update("twitter", v)}
                disabled={saving}
              />
              <Field
                label="YouTube"
                value={form.youtube}
                onChange={(v) => update("youtube", v)}
                disabled={saving}
              />
            </div>
          </div>
        </Card>
      ) : (
        <div className="bg-surface-cambridge/30 rounded-2xl p-6 border border-border-secondary">
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Only your organization&apos;s <strong>primary contact</strong> can
            edit the business listing (address, website, social links). Contact
            the chamber to update those details or to change who the primary
            contact is.
          </p>
        </div>
      )}

      {/* ── Save row ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div aria-live="polite" className="min-h-[1.25rem]">
          {status === "saved" && (
            <span className="text-body-sm font-bold" style={{ color: "#15803d" }}>
              ✓ Saved
            </span>
          )}
          {status === "error" && (
            <span className="text-body-sm" style={{ color: "#b91c1c" }}>
              {error}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="
            px-f34 py-f13
            text-body-sm font-bold text-white
            bg-oxford hover:bg-oxford/90
            rounded-[var(--radius-md)]
            transition-opacity disabled:opacity-40
            cursor-pointer disabled:cursor-not-allowed
          "
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
