import { describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";

describe("db schema barrel", () => {
  it("exports the billing tables the migration depends on", () => {
    expect(schema.memberships).toBeDefined();
    expect(schema.invoices).toBeDefined();
    expect(schema.payments).toBeDefined();
    expect(schema.eventTickets).toBeDefined();
  });
});
