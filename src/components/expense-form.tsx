import { addExpense } from "@/app/actions";
import { CATEGORIES } from "@/db/schema";
import type { SplitType } from "@/lib/split";
import { ActionForm, SubmitButton } from "./forms";

const SPLITS: { type: SplitType; label: string; hint: string }[] = [
  { type: "equal", label: "Equally", hint: "Tick everyone who shares this." },
  { type: "exact", label: "Exact amounts", hint: "Amounts must add up to the total." },
  { type: "shares", label: "By shares", hint: "Give 2 to someone who owes double." },
];

// Full class names, written out so Tailwind can find them at build time.
const SHOW: Record<SplitType, string> = {
  equal: "group-has-[input[value=equal]:checked]:flex",
  exact: "group-has-[input[value=exact]:checked]:flex",
  shares: "group-has-[input[value=shares]:checked]:flex",
};

export function ExpenseForm({
  groupId,
  members,
  currentUserId,
  today,
}: {
  groupId: string;
  members: { id: string; name: string }[];
  currentUserId: string;
  today: string;
}) {
  return (
    <ActionForm action={addExpense} className="mt-6 space-y-5">
      <input type="hidden" name="groupId" value={groupId} />

      <label className="block">
        <span className="mb-1.5 block font-semibold">What was it for?</span>
        <input className="field" name="description" placeholder="Wifi recharge" maxLength={80} required />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-semibold">Amount in rupees</span>
          <input className="field" name="amount" inputMode="decimal" placeholder="1200" required />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-semibold">Date</span>
          <input className="field" name="spentOn" type="date" defaultValue={today} max={today} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-semibold">Paid by</span>
          <select className="field" name="paidBy" defaultValue={currentUserId}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUserId ? `${member.name} (you)` : member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-semibold">Category</span>
          <select className="field capitalize" name="category" defaultValue="food">
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* The three split modes are switched by CSS alone (:has on the checked
          radio), so the form works before hydration and without JavaScript.
          The server reads only the fields that belong to the chosen mode. */}
      <fieldset className="group">
        <legend className="mb-2 font-semibold">How should it be split?</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SPLITS.map((split) => (
            <label key={split.type} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="splitType"
                value={split.type}
                defaultChecked={split.type === "equal"}
              />
              {split.label}
            </label>
          ))}
        </div>
        {SPLITS.map((split) => (
          <p key={split.type} className={`mt-2 hidden text-sm text-ink-soft ${SHOW[split.type]}`}>
            {split.hint}
          </p>
        ))}

        <ul className="mt-3 divide-y divide-ink/15 border-y border-ink/15">
          {members.map((member) => (
            <li key={member.id} className="flex min-h-14 items-center py-2">
              <label className={`hidden flex-1 cursor-pointer items-center gap-3 ${SHOW.equal}`}>
                <input type="checkbox" name="with" value={member.id} defaultChecked />
                {member.name}
              </label>
              <label className={`hidden flex-1 items-center justify-between gap-4 ${SHOW.exact}`}>
                {member.name}
                <input
                  className="field max-w-32 text-right"
                  name={`exact:${member.id}`}
                  inputMode="decimal"
                  placeholder="0"
                />
              </label>
              <label className={`hidden flex-1 items-center justify-between gap-4 ${SHOW.shares}`}>
                {member.name}
                <input
                  className="field max-w-24 text-right"
                  name={`weight:${member.id}`}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={1}
                />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <SubmitButton>Write it down</SubmitButton>
    </ActionForm>
  );
}
