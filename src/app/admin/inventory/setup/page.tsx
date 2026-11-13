import { getLookups } from "@/lib/inventory/inventory";
import { AddSetupItem, SetupRow } from "../setup-forms";
import { Card, PageHeader } from "../ui";

export default async function SetupPage() {
  const { brands, categories, types } = await getLookups();
  return (
    <>
      <PageHeader
        title="Brands & setup"
        subtitle="Brands are kept separate from material types. Rename or deactivate anything; deactivated items disappear from pickers but old stock history keeps them."
      />

      <Card>
        <h2 className="text-lg font-black">Brands</h2>
        <p className="mb-4 text-sm text-neutral-600">Add a brand when you start buying it. “Other / Unbranded” covers locally sourced or unknown-brand materials.</p>
        <AddSetupItem intent="brand_add" placeholder="New brand name" />
        <ul className="mt-4 space-y-2">
          {brands.map((b) => (
            <SetupRow key={b.id} kind="brand" id={b.id} name={b.name} isActive={b.is_active} note={b.is_default ? "Default for unknown brands" : undefined} />
          ))}
        </ul>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-black">Categories</h2>
        <p className="mb-4 text-sm text-neutral-600">The default unit pre-fills when you create a material in that category.</p>
        <AddSetupItem intent="category_add" placeholder="New category name" withUnit />
        <ul className="mt-4 space-y-2">
          {categories.map((c) => (
            <SetupRow key={c.id} kind="category" id={c.id} name={c.name} isActive={c.is_active} />
          ))}
        </ul>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-black">Material types</h2>
        <p className="mb-4 text-sm text-neutral-600">Finishes and kinds within a category, e.g. Glitter or Puff under HTV.</p>
        <AddSetupItem intent="type_add" placeholder="New material type" categories={categories.filter((c) => c.is_active)} />
        <div className="mt-4 space-y-5">
          {categories.map((c) => {
            const list = types.filter((t) => t.category_id === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-black/55">{c.name}</h3>
                <ul className="space-y-2">
                  {list.map((t) => <SetupRow key={t.id} kind="type" id={t.id} name={t.name} isActive={t.is_active} />)}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
