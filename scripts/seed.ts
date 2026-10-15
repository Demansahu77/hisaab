// Fills the database with a demo flat so the app has something to show.
// Run with: pnpm db:seed   (every demo account uses the password "password123")
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema.ts";
import { computeShares } from "../src/lib/split.ts";

const db = drizzle(
  createClient({
    url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN,
  }),
  { schema },
);

const passwordHash = await bcrypt.hash("password123", 10);
const ids: Record<string, string> = {};

for (const name of ["Asha", "Bilal", "Chitra", "Dev"]) {
  const email = `${name.toLowerCase()}@example.com`;
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  const [created] = existing
    ? [existing]
    : await db
        .insert(schema.users)
        .values({ name, email, passwordHash })
        .returning({ id: schema.users.id });
  ids[name] = created.id;
}

const [group] = await db
  .insert(schema.groups)
  .values({ name: "Room 214", inviteCode: "ROOM24", createdBy: ids.Asha })
  .onConflictDoNothing()
  .returning({ id: schema.groups.id });

if (!group) {
  console.log("Demo group already exists, nothing to do.");
  process.exit(0);
}

const everyone = Object.values(ids);
await db
  .insert(schema.members)
  .values(everyone.map((userId) => ({ groupId: group.id, userId })));

const entries = [
  { what: "Mess advance", by: "Asha", rupees: 4800, on: "2026-09-02", category: "food", among: everyone },
  { what: "Wifi recharge", by: "Bilal", rupees: 1200, on: "2026-09-05", category: "utilities", among: everyone },
  { what: "Auto to the station", by: "Chitra", rupees: 360, on: "2026-09-09", category: "travel", among: [ids.Asha, ids.Chitra, ids.Dev] },
  { what: "Cylinder refill", by: "Asha", rupees: 1100, on: "2026-09-14", category: "utilities", among: everyone },
  { what: "Maggi and chai", by: "Dev", rupees: 250, on: "2026-09-17", category: "food", among: everyone },
  { what: "October groceries", by: "Bilal", rupees: 2140, on: "2026-10-03", category: "groceries", among: everyone },
] as const;

for (const entry of entries) {
  const total = entry.rupees * 100;
  const [expense] = await db
    .insert(schema.expenses)
    .values({
      groupId: group.id,
      description: entry.what,
      amount: total,
      category: entry.category,
      splitType: "equal",
      paidBy: ids[entry.by],
      spentOn: entry.on,
      createdBy: ids[entry.by],
    })
    .returning({ id: schema.expenses.id });
  await db.insert(schema.expenseShares).values(
    computeShares({ type: "equal", total, userIds: [...entry.among] }).map((share) => ({
      expenseId: expense.id,
      ...share,
    })),
  );
}

console.log("Seeded Room 214 with 4 members and", entries.length, "entries.");
