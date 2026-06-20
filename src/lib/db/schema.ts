/**
 * Schema barrel — re-exports every table, enum, relation, and interface
 * from the domain modules. Import from here, not from individual modules.
 *
 * Usage:
 *   import { organizations, contacts, memberships } from "@/lib/db/schema";
 */

export * from "./schema/organizations";
export * from "./schema/memberships";
export * from "./schema/payments";
export * from "./schema/committees";
export * from "./schema/crm";
export * from "./schema/events";
export * from "./schema/email";
export * from "./schema/workflows";
export * from "./schema/analytics";
export * from "./schema/deals";
export * from "./schema/sponsorships";
export * from "./schema/resources";
