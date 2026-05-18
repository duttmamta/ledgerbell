# LedgerBell 🔔

**The real-time alert layer for Xero and Sage.**

Know the moment an invoice is paid, a cash balance drops, a VAT deadline approaches, or a Peppol e-invoice arrives — delivered instantly to your WhatsApp, Slack, or email.

> *Xero and Sage record everything. LedgerBell tells you the moment it happens.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for Xero](https://img.shields.io/badge/Built%20for-Xero-13B5EA.svg)](https://developer.xero.com)
[![Built for Sage](https://img.shields.io/badge/Built%20for-Sage-00B050.svg)](https://developer.sage.com)
[![Status: Building](https://img.shields.io/badge/Status-Building-orange.svg)]()
[![Launch: Dec 2026](https://img.shields.io/badge/Launch-Dec%202026-purple.svg)]()

---

## The problem

Xero confirmed in January 2026 that payment notifications are *"not in the short term roadmap"* — a feature users have been requesting since 2012. Over 4 million businesses use Xero globally. None of them get a WhatsApp when an invoice is paid.

The same gap exists in Sage. Business owners log in to find out what happened. LedgerBell tells them the moment it does.

---

## What LedgerBell does

LedgerBell connects to your accounting software and sends push alerts across your chosen channels when financial events occur.

### Alert triggers

| Trigger | Platforms | Channels | Frequency |
|---|---|---|---|
| Invoice paid | Xero, Sage | WhatsApp, Email, Slack | Within 5 min |
| Invoice overdue | Xero, Sage | WhatsApp, Email, Slack | Daily (configurable: 7/14/30 days) |
| Cash balance below threshold | Xero, Sage | WhatsApp, Email, Slack | Every 30 min |
| VAT return deadline approaching | Xero, Sage | Email | Daily at 9am (30/14/7 days before) |
| Peppol e-invoice received | Sage | WhatsApp, Email | Within 5 min |
| Invoice awaiting approval | Xero | Slack, Email | Hourly |

### Example WhatsApp alert

```
🔔 LedgerBell

Invoice #INV-084 paid
Customer: Bright & Co Ltd
Amount: £2,150.00
Account: Xero — Main trading

View invoice → xero.com/...
```

---

## Architecture

```
User connects Xero / Sage (OAuth 2.0)
           ↓
Encrypted tokens stored in Supabase
           ↓
BullMQ job scheduler (Redis)
  · Staggered polling slots (userId % 60)
  · Per-user, per-trigger job queue
           ↓
Poll accounting API every N minutes
  · Compare against last_seen_ids (deduplication)
  · Update poll_state timestamp
           ↓
Trigger condition met?
  YES → Route to alert channels
  NO  → Sleep until next poll
           ↓
┌──────────────────────────────┐
│  Alert channels              │
│  WhatsApp  →  Twilio         │
│  Email     →  Resend         │
│  Slack     →  Incoming Hook  │
└──────────────────────────────┘
           ↓
Log to alert_log (status: sent | failed)
```

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Server components, fast |
| Backend | Node.js (API routes) | Xero/Sage SDKs well supported |
| Database | Supabase (PostgreSQL) | Row Level Security, realtime |
| Job queue | BullMQ + Redis (Upstash) | Reliable polling, retry logic |
| Auth | Clerk | User accounts in a weekend |
| WhatsApp | Twilio Business API | Only production-grade option |
| Email | Resend | Superior deliverability |
| Payments | Stripe | Subscriptions + Customer Portal |
| Deployment | Vercel (frontend) + Railway (workers) | Zero-config deploys |
| Monitoring | Sentry + Uptime Robot | Error tracking + uptime |

---

## Database schema

```sql
-- Users
create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  clerk_id    text unique not null,
  plan        text not null default 'starter', -- starter | pro | scale
  stripe_customer_id text,
  subscription_id    text,
  subscription_status text,
  created_at  timestamptz default now()
);

-- Xero connections
create table xero_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  tenant_id       text not null,
  tenant_name     text,
  access_token    text not null,  -- AES-256-CBC encrypted
  refresh_token   text not null,  -- AES-256-CBC encrypted
  token_expires_at timestamptz,
  connected_at    timestamptz default now()
);

-- Sage connections
create table sage_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  business_id     text not null,
  business_name   text,
  access_token    text not null,  -- AES-256-CBC encrypted
  refresh_token   text not null,  -- AES-256-CBC encrypted
  token_expires_at timestamptz,
  connected_at    timestamptz default now()
);

-- Alert configurations (per user, per trigger)
create table alert_configs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  source          text not null,  -- xero | sage
  trigger_type    text not null,  -- invoice_paid | overdue | cash_threshold
                                  -- | vat_deadline | peppol | awaiting_approval
  is_active       boolean default true,
  threshold_value jsonb,          -- { "days": 14 } or { "amount": 5000 }
  channel         text not null,  -- whatsapp | email | slack
  recipients      jsonb not null, -- ["+447700900142"] or ["user@co.uk"]
  created_at      timestamptz default now()
);

-- Poll state (deduplication)
create table poll_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  source          text not null,  -- xero | sage
  trigger_type    text not null,
  last_polled_at  timestamptz,
  last_seen_ids   jsonb default '[]'  -- invoice IDs already alerted
);

-- Alert log (history)
create table alert_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  source          text not null,
  trigger_type    text not null,
  channel         text not null,
  recipient       text not null,
  payload         jsonb,          -- what triggered the alert (invoice ID etc)
  status          text not null,  -- sent | failed
  error_message   text,
  sent_at         timestamptz default now()
);
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Xero developer account](https://developer.xero.com) with an app registered
- A [Sage developer account](https://developer.sage.com) with an app registered
- A [Twilio](https://console.twilio.com) account (WhatsApp Business API)
- A [Resend](https://resend.com) account
- A [Clerk](https://clerk.com) account
- Redis (via [Upstash](https://upstash.com) — free tier works for development)

### Installation

```bash
git clone https://github.com/duttmamta/ledgerbell.git
cd ledgerbell
npm install
```

### Environment variables

Create a `.env.local` file in the root. **Never commit this file.**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Xero OAuth
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback

# Sage OAuth
SAGE_CLIENT_ID=your_client_id
SAGE_CLIENT_SECRET=your_client_secret
SAGE_REDIRECT_URI=http://localhost:3000/api/sage/callback

# Token encryption (generate: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_byte_hex_key

# Redis (BullMQ)
REDIS_URL=redis://...

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Resend (email)
RESEND_API_KEY=re_...

# Stripe (billing)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_SCALE_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run locally

```bash
# Start Next.js frontend + API
npm run dev

# In a separate terminal — start BullMQ worker
npm run worker
```

---

## Xero OAuth setup

1. Go to [developer.xero.com](https://developer.xero.com) → My Apps → New App
2. App type: **Web app**
3. Redirect URI: `https://yourdomain.com/api/xero/callback`
4. Scopes required:
   ```
   openid profile email
   accounting.transactions.read
   accounting.contacts.read
   accounting.settings.read
   accounting.reports.read
   offline_access
   ```
5. Copy `Client ID` and `Client Secret` into `.env.local`

**Note:** Pass `Xero-tenant-id` header on every API call. Tokens expire every 30 minutes — always use `getValidToken()` before any API call.

---

## Sage OAuth setup

1. Go to [developer.sage.com](https://developer.sage.com) → My Apps → Create App
2. Redirect URI: `https://yourdomain.com/api/sage/callback`
3. Scopes: `full_access`
4. Token URL: `https://oauth.accounting.sage.com/token`
5. After token exchange, call `GET https://api.accounting.sage.com/accounts/v3.1/business` to retrieve `business_id`
6. Pass `X-Business-ID: {businessId}` header on every subsequent Sage API call

**Note:** Sage tokens expire every 60 minutes (vs Xero's 30). Refresh when `expires_in < 300` seconds.

---

## Pricing

| Plan | Price | Connections | Triggers | Channels |
|---|---|---|---|---|
| Starter | £9/mo | 1 | 3 | WhatsApp + Email |
| Pro | £19/mo | 5 | Unlimited | + Slack, team recipients |
| Scale | £49/mo | Unlimited | Unlimited | All + API access |

All plans include a 14-day free trial.

---

## Roadmap

**Phase 1 — Foundation** (May–Jun 2026)
- [x] GitHub repo created
- [x] Xero developer account
- [x] Sage developer account
- [x] Supabase project
- [ ] Xero OAuth + token encryption
- [ ] Sage OAuth + token encryption
- [ ] BullMQ polling infrastructure
- [ ] First WhatsApp alert end-to-end

**Phase 2 — Core Build** (Jun–Aug 2026)
- [ ] All 6 alert triggers (Xero + Sage)
- [ ] Slack integration
- [ ] Stripe billing + Customer Portal
- [ ] Dashboard UI
- [ ] Trigger config UI

**Phase 3 — Beta** (Aug–Sep 2026)
- [ ] 5 beta users
- [ ] Xero App Store submission
- [ ] Sage Marketplace submission
- [ ] 20 beta users
- [ ] First paying customers

**Phase 4 — Launch** (Oct–Dec 2026)
- [ ] Xero App Store certification approved
- [ ] SEO content (3 articles)
- [ ] Accountant partner programme
- [ ] Innovate UK Women in Innovation application
- [ ] 🚀 Launch: December 1, 2026

---

## GDPR & data

LedgerBell is designed with data minimisation from day one:

- **What we store:** user credentials (encrypted), alert configurations, invoice IDs and timestamps for deduplication, alert delivery history
- **What we never store:** invoice amounts, customer names, financial records, or any accounting data beyond the minimum needed to detect events
- **Retention:** alert history auto-deleted after 90 days; all data deleted immediately on account closure
- **Encryption:** all OAuth tokens encrypted at rest with AES-256-CBC
- **Sub-processors:** Supabase, Twilio, Resend, Vercel, Clerk, Stripe (all with signed DPAs)
- **ICO registered:** [registration number TBC]

See [Privacy Policy](https://ledgerbell.com/legal/privacy) and [Terms of Service](https://ledgerbell.com/legal/terms).

---

## Contributing

LedgerBell is currently in private development. Once launched, contribution guidelines will be published.

---

## Legal

LedgerBell is a trading name of **XTREC LIMITED** (registered in England and Wales).

LedgerBell is not affiliated with, endorsed by, or certified by Xero Limited or Sage Group plc. Xero and Sage are trademarks of their respective owners.

---

## Contact

- Website: [ledgerbell.com](https://ledgerbell.com) *(coming soon)*
- GitHub: [@duttmamta](https://github.com/duttmamta)
- Built by Mamta — software engineer, UK

---

*Building the notification layer that Xero and Sage forgot to ship.*
