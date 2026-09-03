# CertTrack

Certificate and renewal tracker for trades — roofers, sparkies, plumbers and
scaffolders running 1–6 person outfits. Public liability, CSCS cards, van
MOTs, ladder inspections and DBS checks all expire on different dates; a
lapsed cert can lose a job. CertTrack keeps every expiry in one place and
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
Prisma + SQLite (swap to Postgres for real deployments — see below) · Resend
for email · Stripe for billing (optional — falls back to a demo/manual mode
without it).

## Getting started

```bash
npm install          # also runs `prisma generate` via postinstall
npx prisma migrate deploy   # creates prisma/dev.db and applies migrations
npm run dev
```

Open http://localhost:3000, register a company, and go. `.env` already has
working defaults for local dev (SQLite, a dev auth secret, reminders logged
to the console instead of actually emailed).

Copy `.env.example` to `.env` on a fresh checkout if `.env` isn't present,
and change `AUTH_SECRET` and `CRON_SECRET` to real random strings before
deploying anywhere real.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` for SQLite locally, or a Postgres URL in production |
| `AUTH_SECRET` | yes | Long random string, signs session cookies |
| `APP_URL` | yes | Public base URL — used for reminder email links and Stripe redirects. **Must start with `https://` in production**, or session cookies won't be marked `Secure` |
| `RESEND_API_KEY` | no | Enables real email delivery via [Resend](https://resend.com). Without it, reminder emails are logged to the console instead — handy for local dev/demos |
| `REMINDER_FROM_EMAIL` | no | From-address for reminder emails |
| `CRON_SECRET` | yes (for reminders) | Shared secret the daily reminder job must send |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_CREW`, `STRIPE_PRICE_ID_BUSINESS`, `STRIPE_WEBHOOK_SECRET` | no | Enables real Stripe Checkout + billing portal for trade-company plans. Without them, the Billing page's "Subscribe" / "Cancel" buttons just flip the plan status directly in the database — which is exactly what you want for the free-for-a-testimonial first-10-customers deals |
| `STRIPE_PRICE_ID_CONTRACTOR` | no | Same idea, for the contractor plan at `/contractor/billing` |

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

## Document storage

Uploaded certificate documents are written to `storage/uploads/` (outside
`/public`, gitignored) and served only through the authenticated
`/api/documents/[certId]` route, which checks the requester belongs to the
certificate's company before returning the file. This is deliberate: an
`/public`-served upload would have no access control at all, and Next.js
doesn't reliably serve files added to `/public` after the app was built.

Local disk works for a single-instance deployment or a demo, but won't
survive a redeploy on serverless platforms with ephemeral disks (Vercel,
etc.). For a real production deployment, swap `src/lib/storage.ts` for S3,
Vercel Blob, or similar — the two functions (`saveUploadedDocument`,
`readUploadedDocument`) are the only things that need to change.

## Going to production

1. Point `DATABASE_URL` at a real Postgres database (Supabase, Neon, Vercel
   Postgres all work) and run `npx prisma migrate deploy` against it.
2. Set `APP_URL` to your real `https://` domain — this also flips session
   cookies to `Secure`.
3. Set a real `AUTH_SECRET` and `CRON_SECRET`.
4. Add `RESEND_API_KEY` + a verified sending domain for real reminder
   emails.
5. Add `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`
   for real billing, and point a Stripe webhook at
   `/api/stripe/webhook` (events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`).
6. Swap document storage for S3/Vercel Blob (see above) if deploying
   serverless.
7. Add the `APP_URL` and `CRON_SECRET` GitHub repo secrets so the daily
   reminders workflow can reach the deployed app.

## Go-to-market notes

- **Price:** £8/month per company, unlimited workers and certificates.
- **First 10 customers:** post in the roofing and building trade Facebook
  groups, plus a direct offer to two local firms — set it up free in
  exchange for a testimonial and a referral to three of their mates. The
  Billing page's demo/manual mode (no Stripe keys needed) is built for
  exactly this: activate their plan without ever asking for a card.
- **Growth loop:** the compliance card is the product's own distribution —
  every time a tradesperson sends their card link to a customer or main
  contractor, that's a new person seeing CertTrack who might run their own
  crew.
