import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import {
  expenses,
  expenseShares,
  groups,
  members,
  settlements,
  users,
} from "@/db/schema";
import { readSession } from "./session";
import { computeBalances, simplifyDebts } from "./settle";

// Data access layer: every read goes through here, and every function that
// returns group data first proves the signed-in user belongs to that group.

/** The signed-in user, or a redirect to /login. Cached per request. */
export const requireUser = cache(async () => {
  const userId = await readSession();
  if (!userId) redirect("/login");

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) redirect("/login");
  return user;
});

export async function isMember(groupId: string, userId: string) {
  const [row] = await db
    .select({ userId: members.userId })
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.userId, userId)));
  return Boolean(row);
}

async function loadLedger(groupIds: string[]) {
  if (groupIds.length === 0) return { expenseRows: [], shareRows: [], settlementRows: [] };

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.groupId, groupIds))
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt));

  const shareRows = await db
    .select({
      expenseId: expenseShares.expenseId,
      userId: expenseShares.userId,
      amount: expenseShares.amount,
    })
    .from(expenseShares)
    .innerJoin(expenses, eq(expenses.id, expenseShares.expenseId))
    .where(inArray(expenses.groupId, groupIds));

  const settlementRows = await db
    .select()
    .from(settlements)
    .where(inArray(settlements.groupId, groupIds))
    .orderBy(desc(settlements.createdAt));

  return { expenseRows, shareRows, settlementRows };
}

/** Every group the user is in, with member count, total spend and their own balance. */
export async function getGroupsForUser(userId: string) {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      memberCount: sql<number>`(select count(*) from ${members} m where m.group_id = ${groups.id})`,
    })
    .from(groups)
    .innerJoin(members, eq(members.groupId, groups.id))
    .where(eq(members.userId, userId))
    .orderBy(desc(groups.createdAt));

  const { expenseRows, shareRows, settlementRows } = await loadLedger(
    rows.map((row) => row.id),
  );

  return rows.map((group) => {
    const groupExpenses = expenseRows.filter((e) => e.groupId === group.id);
    const ids = new Set(groupExpenses.map((e) => e.id));
    const balances = computeBalances(
      [userId],
      groupExpenses.map((e) => ({
        paidBy: e.paidBy,
        shares: shareRows.filter((s) => s.expenseId === e.id),
      })),
      settlementRows
        .filter((s) => s.groupId === group.id)
        .map((s) => ({ from: s.fromUser, to: s.toUser, amount: s.amount })),
    );
    return {
      ...group,
      total: groupExpenses.reduce((acc, e) => acc + e.amount, 0),
      expenseCount: ids.size,
      balance: balances.get(userId) ?? 0,
    };
  });
}

/** Full detail for one group. 404s unless the user is a member. */
export async function getGroup(groupId: string, userId: string) {
  if (!(await isMember(groupId, userId))) notFound();

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) notFound();

  const memberRows = await db
    .select({ id: users.id, name: users.name })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(eq(members.groupId, groupId))
    .orderBy(members.joinedAt);

  const { expenseRows, shareRows, settlementRows } = await loadLedger([groupId]);

  const expenseList = expenseRows.map((expense) => ({
    ...expense,
    shares: shareRows.filter((share) => share.expenseId === expense.id),
  }));

  const balances = computeBalances(
    memberRows.map((m) => m.id),
    expenseList,
    settlementRows.map((s) => ({ from: s.fromUser, to: s.toUser, amount: s.amount })),
  );

  return {
    group,
    members: memberRows,
    expenses: expenseList,
    settlements: settlementRows,
    balances,
    transfers: simplifyDebts(balances),
    total: expenseList.reduce((acc, e) => acc + e.amount, 0),
  };
}

/** Spend grouped by category and by month, aggregated in SQL. */
export async function getGroupStats(groupId: string) {
  const byCategory = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .where(eq(expenses.groupId, groupId))
    .groupBy(expenses.category)
    .orderBy(sql`sum(${expenses.amount}) desc`);

  const byMonth = await db
    .select({
      month: sql<string>`substr(${expenses.spentOn}, 1, 7)`,
      total: sql<number>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .where(eq(expenses.groupId, groupId))
    .groupBy(sql`substr(${expenses.spentOn}, 1, 7)`)
    .orderBy(sql`substr(${expenses.spentOn}, 1, 7)`);

  return { byCategory, byMonth };
}
