import { CONTENT_FIELD_DEFS, getContentField, getCmsPricing, DEFAULT_PRICING } from "@/lib/cms-store";
import { ContentField } from "@/components/admin/ContentField";
import { PricingEditor } from "@/components/admin/PricingEditor";

export const dynamic = "force-dynamic";

export default async function ContentEditorPage() {
  type FieldWithValue = { def: (typeof CONTENT_FIELD_DEFS)[number]; currentValue: string; isOverridden: boolean };

  // Load pricing + all content fields in parallel
  const [savedPricing, fieldsWithValues] = await Promise.all([
    getCmsPricing(),
    Promise.all(
      CONTENT_FIELD_DEFS.map(async (def): Promise<FieldWithValue> => {
        const override = await getContentField(def.page, def.field);
        return {
          def,
          currentValue: override ?? def.defaultValue,
          isOverridden: override !== null,
        };
      }),
    ),
  ]);

  const pricing = savedPricing ?? DEFAULT_PRICING;
  const pricingIsOverridden = savedPricing !== null;
  const pricingUpdatedAt = savedPricing?.updatedAt ?? null;

  // Group content fields by page
  const byPage = fieldsWithValues.reduce<Record<string, FieldWithValue[]>>(
    (acc, item) => {
      (acc[item.def.page] ??= []).push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="px-6 py-6 max-w-5xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Content Editor</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Edit text and pricing that appears on public pages. Changes go live immediately.
        </p>
      </div>

      {/* Membership Pricing */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-4">
          Membership Pricing
        </h2>
        <PricingEditor
          initialPricing={pricing}
          isOverridden={pricingIsOverridden}
          updatedAt={pricingUpdatedAt ?? null}
        />
      </section>

      {/* Page Copy */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
          Page Copy
        </h2>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
          <strong>Heads up:</strong> These fields override the default text built into each page.
          Resetting a field restores the original. Navigation and event registration links cannot
          be changed here.
        </div>

        <div className="space-y-8">
          {Object.entries(byPage).map(([page, items]) => (
            <div key={page}>
              <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
                {page.charAt(0).toUpperCase() + page.slice(1)} Page
              </h3>
              <div className="space-y-3">
                {items.map(({ def, currentValue, isOverridden }) => (
                  <ContentField
                    key={`${def.page}:${def.field}`}
                    def={def}
                    currentValue={currentValue}
                    isOverridden={isOverridden}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
