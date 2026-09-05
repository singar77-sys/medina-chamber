/**
 * /portal/profile — member self-service profile editing
 *
 * Server Component: same auth guard as the dashboard. Loads the member's own
 * contact record + their organization's listing, then hands the current values
 * to the <ProfileForm> client island, which POSTs changes to
 * /api/portal/profile. Org-listing fields are only editable by the org's
 * primary contact (enforced server-side in the route; the form just hides them
 * for everyone else).
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readPortalSession } from "@/lib/portal-session";
import { ProfileForm } from "./ProfileForm";
import { PortalTopBar } from "@/components/portal/PortalTopBar";

export default async function PortalProfilePage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal");

  const [contactRows, orgRows] = await Promise.all([
    db
      .select({
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        title: contacts.title,
        phone: contacts.phone,
        isPrimaryContact: contacts.isPrimaryContact,
      })
      .from(contacts)
      .where(eq(contacts.id, session.contactId))
      .limit(1),

    db
      .select({
        name: organizations.name,
        phone: organizations.phone,
        email: organizations.email,
        websiteUrl: organizations.websiteUrl,
        address1: organizations.address1,
        address2: organizations.address2,
        city: organizations.city,
        state: organizations.state,
        zip: organizations.zip,
        facebook: organizations.facebook,
        twitter: organizations.twitter,
        instagram: organizations.instagram,
        linkedin: organizations.linkedin,
        youtube: organizations.youtube,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1),
  ]);

  const contact = contactRows[0];
  const org = orgRows[0];
  if (!contact || !org) redirect("/portal");

  return (
    <div className="min-h-full flex flex-col">
      <PortalTopBar
        links={[
          { href: "/portal/dashboard", label: "Dashboard" },
          { href: "/portal/billing", label: "Billing" },
        ]}
      />

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Edit profile</h1>
          <p className="text-text-secondary text-sm mt-1">{org.name}</p>
        </div>

        <ProfileForm
          isPrimary={contact.isPrimaryContact}
          loginEmail={contact.email ?? ""}
          initial={{
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            title: contact.title ?? "",
            phone: contact.phone ?? "",
            orgPhone: org.phone ?? "",
            orgEmail: org.email ?? "",
            websiteUrl: org.websiteUrl ?? "",
            address1: org.address1 ?? "",
            address2: org.address2 ?? "",
            city: org.city ?? "",
            state: org.state ?? "",
            zip: org.zip ?? "",
            facebook: org.facebook ?? "",
            twitter: org.twitter ?? "",
            instagram: org.instagram ?? "",
            linkedin: org.linkedin ?? "",
            youtube: org.youtube ?? "",
          }}
        />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}
