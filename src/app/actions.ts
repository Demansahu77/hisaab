"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  CATEGORIES,
  expenses,
  expenseShares,
  groups,
  members,
  settlements,
  users,
} from "@/db/schema";
import { isMember, requireUser } from "@/lib/dal";
import { toPaise } from "@/lib/money";
import { createSession, deleteSession } from "@/lib/session";
import { computeShares, type SplitInput, SplitError } from "@/lib/split";

export type FormState = { error?: string } | undefined;

const credentials = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Password needs at least 8 characters."),
});

const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid input.";

// ---------- auth ----------

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials
    .extend({ name: z.string().trim().min(2, "Enter your name.").max(40) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, email, password } = parsed.data;
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing) return { error: "An account with this email already exists." };

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 10) })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect(safeNext(form));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email));

  // Same message for unknown email and wrong password, so the form does not
  // reveal which emails have accounts.
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!ok) return { error: "Email or password is incorrect." };

  await createSession(user.id);
  redirect(safeNext(form));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}

// Only follow same-site relative paths after login, never an external URL.
function safeNext(form: FormData) {
  const next = String(form.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/groups";
}

// ---------- groups ----------

function newInviteCode() {
  // No 0/O/1/I so codes survive being read aloud or typed from a screenshot.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function createGroup(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { error: "Group name should be 2 to 40 characters." };
  }

  const [group] = await db
    .insert(groups)
    .values({ name, inviteCode: newInviteCode(), createdBy: user.id })
    .returning({ id: groups.id });
  await db.insert(members).values({ groupId: group.id, userId: user.id });

  redirect(`/groups/${group.id}`);
}

export async function joinGroup(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = String(form.get("code") ?? "").trim().toUpperCase();

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.inviteCode, code));
  if (!group) return { error: "No group uses that invite code." };

  await db
    .insert(members)
    .values({ groupId: group.id, userId: user.id })
    .onConflictDoNothing();

  redirect(`/groups/${group.id}`);
}

// ---------- expenses ----------

const expenseFields = z.object({
  groupId: z.string().min(1),
  description: z.string().trim().min(1, "Say what the money was for.").max(80),
  category: z.enum(CATEGORIES),
  paidBy: z.string().min(1),
  spentOn: z.iso.date("Pick a valid date."),
  splitType: z.enum(["equal", "exact", "shares"]),
});

export async function addExpense(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = expenseFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const fields = parsed.data;

  if (!(await isMember(fields.groupId, user.id))) {
    return { error: "You are not in this group." };
  }

  const total = toPaise(String(form.get("amount") ?? ""));
  if (!total) return { error: "Enter an amount like 450 or 450.50." };

  const memberIds = (
    await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.groupId, fields.groupId))
  ).map((row) => row.userId);

  if (!memberIds.includes(fields.paidBy)) {
    return { error: "The payer must be a member of this group." };
  }

  // Build the split from the form, reading only fields for real members so a
  // crafted request cannot assign a share to someone outside the group.
  let split: SplitInput;
  if (fields.splitType === "equal") {
    const picked = form.getAll("with").map(String);
    split = {
      type: "equal",
      total,
      userIds: memberIds.filter((id) => picked.includes(id)),
    };
  } else if (fields.splitType === "exact") {
    const amounts: Record<string, number> = {};
    for (const id of memberIds) {
      const raw = String(form.get(`exact:${id}`) ?? "").trim();
      if (raw === "") continue;
      const paise = toPaise(raw);
      if (paise === null) return { error: "One of the amounts is not a valid number." };
      amounts[id] = paise;
    }
    split = { type: "exact", total, amounts };
  } else {
    const weights: Record<string, number> = {};
    for (const id of memberIds) {
      weights[id] = Number(form.get(`weight:${id}`) ?? 0);
    }
    split = { type: "shares", total, weights };
  }

  let shares;
  try {
    shares = computeShares(split);
  } catch (error) {
    if (error instanceof SplitError) return { error: error.message };
    throw error;
  }

  // Expense and its shares are written together or not at all.
  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        groupId: fields.groupId,
        description: fields.description,
        amount: total,
        category: fields.category,
        splitType: fields.splitType,
        paidBy: fields.paidBy,
        spentOn: fields.spentOn,
        createdBy: user.id,
      })
      .returning({ id: expenses.id });
    await tx
      .insert(expenseShares)
      .values(shares.map((share) => ({ expenseId: expense.id, ...share })));
  });

  revalidatePath(`/groups/${fields.groupId}`);
  redirect(`/groups/${fields.groupId}`);
}

export async function deleteExpense(form: FormData) {
  const user = await requireUser();
  const expenseId = String(form.get("expenseId") ?? "");

  const [expense] = await db
    .select({ groupId: expenses.groupId })
    .from(expenses)
    .where(eq(expenses.id, expenseId));
  if (!expense || !(await isMember(expense.groupId, user.id))) return;

  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath(`/groups/${expense.groupId}`);
}

// ---------- settle up ----------

export async function recordSettlement(form: FormData) {
  const user = await requireUser();
  const groupId = String(form.get("groupId") ?? "");
  const fromUser = String(form.get("from") ?? "");
  const toUser = String(form.get("to") ?? "");
  const amount = Number(form.get("amount"));

  if (!Number.isInteger(amount) || amount <= 0 || fromUser === toUser) return;
  // Only the two people involved may mark a payment as done.
  if (user.id !== fromUser && user.id !== toUser) return;

  const both = await db
    .select({ userId: members.userId })
    .from(members)
    .where(eq(members.groupId, groupId));
  const ids = both.map((row) => row.userId);
  if (!ids.includes(fromUser) || !ids.includes(toUser)) return;

  await db.insert(settlements).values({ groupId, fromUser, toUser, amount });
  revalidatePath(`/groups/${groupId}`);
}
