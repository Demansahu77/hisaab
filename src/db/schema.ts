import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const groups = sqliteTable("groups", {
  id: id(),
  name: text("name").notNull(),
  // Short code members share to let others join.
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const members = sqliteTable(
  "members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index("members_user_idx").on(table.userId),
  ],
);

export const CATEGORIES = [
  "food",
  "groceries",
  "rent",
  "utilities",
  "travel",
  "fun",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    // Integer paise, never floats. See src/lib/money.ts.
    amount: integer("amount").notNull(),
    category: text("category", { enum: CATEGORIES }).notNull(),
    splitType: text("split_type", {
      enum: ["equal", "exact", "shares"],
    }).notNull(),
    paidBy: text("paid_by")
      .notNull()
      .references(() => users.id),
    // ISO date (YYYY-MM-DD) the money was spent; sorts and groups as text.
    spentOn: text("spent_on").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index("expenses_group_idx").on(table.groupId, table.spentOn)],
);

// One row per person who owes part of an expense. Rows sum to expenses.amount.
export const expenseShares = sqliteTable(
  "expense_shares",
  {
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
  },
  (table) => [primaryKey({ columns: [table.expenseId, table.userId] })],
);

// A direct repayment between two members, recorded when someone settles up.
export const settlements = sqliteTable(
  "settlements",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromUser: text("from_user")
      .notNull()
      .references(() => users.id),
    toUser: text("to_user")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("settlements_group_idx").on(table.groupId)],
);
