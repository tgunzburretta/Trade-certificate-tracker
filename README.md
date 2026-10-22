# Vetted

Certificate and renewal tracker for trades — roofers, sparkies, plumbers and
scaffolders running 1–6 person outfits. Public liability, CSCS cards, van
MOTs, ladder inspections and DBS checks all expire on different dates; a
lapsed cert can lose a job. Vetted keeps every expiry in one place and
emails whoever's in charge at 60/30/7 days before anything lapses.

## Screens

- **Dashboard** — every certificate across the company, grouped by urgency.
- **Add certificate** — pick a type, an expiry date, optionally a worker, and
  snap a photo of the document (one tap, straight from the phone).
- **Workers** — per-worker view of who's covered and who isn't.
- **Compliance card** (`/c/[slug]`) — a public, no-login link you text or
  email to a customer or main contractor showing your certs are current.
  Document contents are never shown publicly, only status.
- **Billing** — three tiers by crew size (see `PLAN_TIERS` in
  `src/lib/constants.ts`): Solo (1 worker, £7/mo), Crew (up to 6 workers,
  £15/mo), Business (unlimited workers, £29/mo). 14-day free trial on every
  tier, no card needed.
- **For contractors** (`/for-contractors`) — a separate paid product for main
  contractors: a login of their own, a dashboard listing subcontractors by
  the compliance-card link the sub gave them, and a live red/amber/green
  status per sub. £19/month, 14-day free trial. This is a distinct account
  type (`Contractor`/`WatchedSub` in the schema) from the trade-company
  accounts above — a contractor doesn't have workers or certificates of
  their own, just a watchlist of other companies' public compliance cards.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS ·
Prisma + PostgreSQL · Cloudflare R2 for uploaded documents (falls back to
local disk in development) · Resend for email · Stripe for billing (optional
— falls back to a demo/manual mode without it).

## Getting started

You need a PostgreSQL database. Either run one locally, or create a free
branch on [Neon](https://neon.tech) and use its connection string.

```bash
cp .env.example .env         # then set DATABASE_URL
npm install                  # also runs `prisma generate` via postinstall
npx prisma migrate deploy    # creates the schema
npm run dev
```

Open http://localhost:3000, register a company, and go. With nothing else
configured the app still works end to end: reminder, verification and
password-reset emails are logged to the console rather than sent, documents
go to local disk, and billing runs in demo mode.

Change `AUTH_SECRET` and `CRON_SECRET` to real random strings
(`openssl rand -hex 32`) before deploying anywhere real.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string the app runs on. On Neon, the **pooled** one (host contains `-pooler`) |
| `DIRECT_DATABASE_URL` | yes | Same database, **not** pooled — migrations run over this. PgBouncer breaks Prisma's prepared statements and `migrate deploy`'s advisory lock. With no pooler, set it to the same value as `DATABASE_URL` |
| `AUTH_SECRET` | yes | Long random string, signs session cookies |
| `APP_URL` | yes | Public base URL — used for reminder email links and Stripe redirects. **Must start with `https://` in production**, or session cookies won't be marked `Secure` |
| `RESEND_API_KEY` | no | Enables real email delivery via [Resend](https://resend.com) for reminders, email verification and password reset links. Without it, these are logged to the console instead — handy for local dev/demos, but verification/reset links only work if you can read that log |
| `REMINDER_FROM_EMAIL` | no | From-address for reminder emails |
| `CRON_SECRET` | yes (for reminders) | Shared secret the daily reminder job must send |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_CREW`, `STRIPE_PRICE_ID_BUSINESS`, `STRIPE_WEBHOOK_SECRET` | no | Enables real Stripe Checkout + billing portal for trade-company plans. Without them, the Billing page's "Subscribe" / "Cancel" buttons just flip the plan status directly in the database — which is exactly what you want for the free-for-a-testimonial first-10-customers deals |
| `COMPANIES_HOUSE_API_KEY` | no | Free key from the [Companies House developer hub](https://developer.company-information.service.gov.uk/get-started). Enables business verification at signup — see below |
| `COMPANIES_HOUSE_API_URL` | no | Override the API base URL, e.g. to use the Companies House sandbox |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | in production | Cloudflare R2 for uploaded documents. Without them uploads go to local disk, which a cloud host wipes on every deploy — see "Document storage" |
| `STRIPE_PRICE_ID_CONTRACTOR` | no | Same idea, for the contractor plan at `/contractor/billing` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | Backs login rate limiting with [Upstash Redis](https://upstash.com) so it's shared across instances/replicas. Without them, rate limiting falls back to a per-instance in-memory counter (`src/lib/rateLimit.ts`) — fine for a single Node process, not for multiple replicas or serverless |

## Account security

- **Password hashing**: bcrypt, both account types.
- **Email verification**: every new signup (trade company and contractor)
  gets a verification email with a 24-hour single-use link
  (`src/lib/tokens.ts`). Unverified accounts see a dismissable reminder
  banner but aren't blocked from using the app — verification isn't a hard
  gate, just confirms the address is real and reachable.
- **Password reset**: `/forgot-password` (trade) and
  `/contractor/forgot-password` (contractor) send a 1-hour single-use reset
  link. The response is identical whether or not the email is registered,
  so the flow can't be used to enumerate accounts.
- **Login rate limiting**: 10 attempts per email per 15 minutes on both
  login forms (`src/lib/rateLimit.ts`), Redis-backed when configured (see
  env vars above).

## Renewal reminders (60 / 30 / 7 days)

`src/lib/reminders.ts` is the core sweep: for every certificate, it works
out days-to-expiry and sends the most urgent threshold crossed that hasn't
been sent yet, logging it to `ReminderLog` so it's never sent twice and only
ever escalates (a 30-day warning never fires after the 7-day one already
went out for the same cert). Renewing a certificate clears its reminder
history so the new expiry date gets its own 60/30/7 cycle.

Two ways to run it:

- **`npm run reminders`** — runs the sweep directly against the local
  database. Good for testing.
- **`GET/POST /api/cron/reminders`** — the same sweep behind an HTTP
  endpoint, guarded by `CRON_SECRET` (send it as either the `x-cron-secret`
  header or a `?secret=` query param). `.github/workflows/reminders.yml`
  calls this daily via GitHub Actions — set the `APP_URL` and `CRON_SECRET`
  repo secrets after you deploy for it to work.

## Business verification

Certificates are only as credible as the business behind them, so CertTrack
checks the company against public registers rather than taking their word for
it. Companies House is wired up today; the adapter pattern in
`src/lib/verification/` is designed so other sources slot in beside it.

**How it works**

- At signup the customer can give their Companies House number. We look it up,
  confirm the company is real and active, and prefill their registered name and
  address — so verification *saves* them typing rather than being a hoop.
- Every check is appended to `CompanyVerification` as an immutable row with the
  raw response stored. Rows are never updated or deleted: if a customer ever
  disputes what their compliance card claimed, we need to show what the register
  said **on the day**, not what it says now.
- The daily sweep re-checks companies every 30 days, and retries failed checks
  on the next run. A company entering liquidation between checks is reported as
  `newlyAdverse`.

**Design rules worth preserving**

- **`CHECK_FAILED` is not `NOT_FOUND`.** A register we couldn't reach is our
  problem and renders as "we'll retry" — never as a mark against the company.
- **Never a bare green tick.** The UI always names the register, what it said,
  and when we asked. A main contractor cares which claims were machine-checked.
- **The public compliance card reads stored rows only** and never calls an
  external API during render — it's unauthenticated, so doing otherwise would be
  both a rate-limit risk and an abuse vector. Inconclusive results are withheld
  from it; an adverse result is *shown*, because hiding a dissolved company from
  the customer viewing the card would defeat the purpose.

**Setup:** register for a free key at
[developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/get-started)
and set `COMPANIES_HOUSE_API_KEY`. Without it, signup still works and the
company simply isn't verified. `COMPANIES_HOUSE_API_URL` can point at the
Companies House sandbox.

Run `npm run test:verification` to exercise the adapter's mapping and failure
handling against a local stub — no API key needed.

## Document storage

Uploaded certificate documents go to **Cloudflare R2** when it's configured,
and to `storage/uploads/` on local disk otherwise (development only).

Either way they are served solely through the authenticated
`/api/documents/[certId]` route, which checks the requester belongs to the
certificate's company before returning the file. Nothing is ever placed under
`/public`: that would have no access control at all, and Next.js doesn't
reliably serve files added there after the app was built.

**Local disk is not viable in production.** Cloud hosts give you an ephemeral
filesystem, so every uploaded certificate would vanish on the next deploy.
Set these four and R2 takes over automatically:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=vetted-documents
```

The bucket must stay **private** — the app reads objects with its credentials
and streams them through the authenticated route. A public bucket would make
every customer's paperwork world-readable to anyone who guessed a key.

`npm run test:storage` round-trips a document through the R2 path against a
local S3-compatible stub (no Cloudflare account needed); point it at a stub
with `R2_ENDPOINT`.

## Going to production

1. Point `DATABASE_URL` at a hosted Postgres (Neon's free tier is enough to
   start) and `DIRECT_DATABASE_URL` at the same database without its pooler,
   then run `npx prisma migrate deploy` against it. On Neon the two strings
   differ only by `-pooler` in the host; migrations over the pooled one fail
   with a duplicate prepared statement or a lock timeout.
2. Set `APP_URL` to your real `https://` domain — this also flips session
   cookies to `Secure`.
3. Set a real `AUTH_SECRET` and `CRON_SECRET` (`openssl rand -hex 32`).
4. Add `RESEND_API_KEY` and `REMINDER_FROM_EMAIL` on a domain verified in
   Resend. Without these, no reminder, verification or reset email is sent —
   they only get logged.
5. Configure R2 (see above) so uploaded documents survive a deploy.
6. Optionally add `STRIPE_SECRET_KEY`, one `STRIPE_PRICE_ID_*` per plan
   (`SOLO`, `CREW`, `BUSINESS`, `CONTRACTOR`), and `STRIPE_WEBHOOK_SECRET`,
   then point a Stripe webhook at `/api/stripe/webhook` (events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`). Without them billing runs in demo mode,
   which is what you want for free-for-a-testimonial early customers.
7. Add the `APP_URL` and `CRON_SECRET` GitHub repo secrets so the daily
   reminders workflow can reach the deployed app.

## If the app can't talk to the database

Two connection-pooler problems look similar and have different fixes.

**`prepared statement "s0" already exists`, or a P1002 lock timeout, during
a deploy.** Migrations are going through the pooler. `DIRECT_DATABASE_URL`
is either unset or still points at the `-pooler` host. Migrations need the
direct connection; see the datasource block in `prisma/schema.prisma`.

**`prepared statement ... already exists` at runtime, intermittently, after
a successful deploy.** This is the app's own pooled connection. Prisma uses
named prepared statements, which PgBouncer in transaction mode does not
support. Add `&pgbouncer=true` to `DATABASE_URL` and redeploy — no code
change needed.

That flag is deliberately not baked in. It is the long-standing fix for
Prisma behind PgBouncer, but Prisma's current guidance is to leave it off
with PgBouncer 1.21 and later, where it can itself cause errors when the
pooler allows prepared statements. Which applies depends on the version
your provider runs, so deploy without it and add it only if you see that
error.

**`server did not use channel binding`.** The connection string carries
`channel_binding=require` but the server doesn't support it. Neon does, and
adds that parameter itself — so keep it there. Remove it only if you point
the app at a different Postgres.

## Go-to-market notes

- **Price:** trade companies pick Solo (£7/mo, 1 worker), Crew (£15/mo, up
  to 6 workers) or Business (£29/mo, unlimited) — see `PLAN_TIERS` in
  `src/lib/constants.ts`. Contractors pay £19/mo flat for unlimited
  subcontractors on their watchlist.
- **First 10 customers:** post in the roofing and building trade Facebook
  groups, plus a direct offer to two local firms — set it up free in
  exchange for a testimonial and a referral to three of their mates. The
  Billing page's demo/manual mode (no Stripe keys needed) is built for
  exactly this: activate their plan without ever asking for a card.
- **Growth loop, two-sided:** every compliance-card link a tradesperson
  sends a customer or main contractor is a new person seeing Vetted who
  might run their own crew — and every contractor who signs up to watch
  their subs is pushing those subs' companies to get (or keep) a Vetted
  account so their card stays current.
