# Hisaab

A shared ledger for flats and hostels. Everyone writes down what they paid for, and Hisaab works out who pays whom in the fewest payments.

"Hisaab" is Hindi for accounts. The interface is modelled on a bahi-khata, the red cloth-bound ledger used in Indian shops.

## What it does

- **Accounts**: sign up and log in with email and password.
- **Ledgers**: create a ledger for a flat or a trip, and invite others with a six-character code.
- **Entries**: record an expense and split it equally, by exact amounts, or by weighted shares.
- **Settle up**: see each member's balance and the shortest list of payments that clears every debt. Mark a payment as paid once it is done.
- **Breakdown**: spending by category and by month.

## How it works

### Money is stored as whole paise

Floating-point numbers cannot represent 0.1 exactly, so adding rupee decimals drifts over time. Every amount in the database is an integer number of paise. Parsing and formatting live in [`src/lib/money.ts`](src/lib/money.ts).

### Splits never lose a paisa

₹100 split three ways is 33.33 each, which adds up to only 99.99. [`src/lib/split.ts`](src/lib/split.ts) uses the largest-remainder method: everyone gets the rounded-down share, then the leftover paise go one each to whoever lost the largest fraction. The result is 33.34, 33.33, 33.33, and the shares always sum to the total.

### Settle-up reduces many debts to a few payments

Who paid for what stops mattering once you know each person's net balance. [`src/lib/settle.ts`](src/lib/settle.ts) computes those balances, then repeatedly matches the person who owes the most with the person who is owed the most. Each payment clears at least one person, so `n` people never need more than `n - 1` payments.

This greedy approach is not always the true minimum. Finding the exact minimum is NP-hard (it reduces to subset-sum), and for a flat of four to ten people the greedy answer is the same or one payment longer.

### Access control sits in one place

Every database read goes through [`src/lib/dal.ts`](src/lib/dal.ts). Functions that return ledger data first check that the signed-in user is a member, and respond with a 404 otherwise. Server actions in [`src/app/actions.ts`](src/app/actions.ts) repeat the membership check before any write, and only read split fields for real members, so a crafted request cannot assign a share to an outsider.

### Sessions

Logging in sets an HTTP-only cookie containing a signed JWT with just the user id ([`src/lib/session.ts`](src/lib/session.ts)). Passwords are hashed with bcrypt. Login returns the same error for an unknown email and a wrong password, so the form does not reveal which emails have accounts.

### The split form works without JavaScript

The three split modes are switched with a CSS `:has()` selector on the checked radio button, not React state, so the form is usable before the page hydrates.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| Database | SQLite through libSQL, with Drizzle ORM |
| Validation | Zod |
| Auth | bcryptjs and jose (signed JWT cookie) |
| Styling | Tailwind CSS 4 |
| Tests | Vitest |

## Run it locally

Requires Node.js 22 or newer and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then set SESSION_SECRET (openssl rand -base64 32)
pnpm db:push                 # create the tables in local.db
pnpm db:seed                 # optional: a demo flat with four members
pnpm dev
```

Open http://localhost:3000. After seeding, log in as `asha@example.com` with the password `password123`.

## Tests

```bash
pnpm test
```

The tests cover money parsing and formatting, all three split types, balance calculation, and the settle-up algorithm, including the guarantee that shares always sum to the total.

## Project layout

```
src/
  app/            routes and server actions
  components/     forms, the landing-page demo, shared UI
  db/             Drizzle schema and client
  lib/            money, split, settle-up, sessions, data access
scripts/seed.ts   demo data
```

## Possible next steps

- Edit an existing entry.
- Exact minimum settle-up for small groups.
- Export a ledger as CSV.

## Licence

MIT. The display typeface is Gambarino from [Fontshare](https://www.fontshare.com/fonts/gambarino), used under the ITF Free Font Licence.
