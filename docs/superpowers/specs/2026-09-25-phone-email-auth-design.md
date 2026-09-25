# Phone-or-email signup & login

Date: 2026-09-25
Status: approved (Option B chosen by user)

## Goal

Let users create an account and log in with **either** an email address
or a Bangladeshi phone number — their choice, not forced to pick one
permanently. Matches the pattern used by Daraz and most BD/SEA
consumer platforms: signup asks for one identifier (phone tab shown
first, email tab second), login is a single smart field that
auto-detects phone vs email by format.

## Why Option B (native Supabase phone identity)

Two approaches were considered. Option A (placeholder email + hand-rolled
session-minting endpoints) was rejected: it means writing custom code
that issues Supabase sessions outside the SDK, which is unnecessary
security surface for a solved problem. Option B wires the project's
existing BulkSMSBD gateway into Supabase Auth's native **Send SMS
Hook**, so phone becomes a first-class identity exactly like email.
All session issuance stays inside `supabase-js` (`signUp`,
`signInWithPassword`, `verifyOtp`) — no custom token code.

The existing profile-settings phone-verification flow
(`phone_verification` table, `admin_send_contact_otp` /
`admin_confirm_contact_otp` RPCs, `/api/send-contact-otp`,
`/api/confirm-contact-otp`) is a **separate feature** (verifying a
contact phone on an already-logged-in account) and is untouched by
this work.

## Architecture

```
Browser (SignupClient / LoginClient)
   │  supabase.auth.signUp({ phone, password })
   │  supabase.auth.verifyOtp({ phone, token, type: 'sms' })
   │  supabase.auth.signInWithPassword({ phone, password })  -- login
   ▼
Supabase Auth (GoTrue)
   │  on OTP send: calls the Send SMS Hook (Standard Webhooks, signed)
   ▼
Edge Function: send-sms-hook
   │  verifies webhook signature, extracts { user.phone, sms.otp }
   │  calls BulkSMSBD (same gateway as /api/send-contact-otp)
   ▼
BulkSMSBD → SMS to user's phone
```

On successful phone signup, Postgres trigger `handle_new_user` fires
on `auth.users` insert (same as it does for email signup today) and
creates the `profiles` row.

## Components

### 1. Edge Function `send-sms-hook`

New Supabase Edge Function (deployed via the Supabase MCP
`deploy_edge_function` tool — this project has no local `supabase/`
CLI scaffolding, migrations and functions are managed through MCP).

- `verify_jwt: false` — Supabase Auth calls this hook unauthenticated;
  authenticity is established by the Standard Webhooks signature
  (`SEND_SMS_HOOK_SECRET`), verified in the function body per the
  Supabase docs' reference implementation.
- Reads `{ user: { phone }, sms: { otp } }` from the verified payload.
- Sends `Your Cloud PerfumeBd verification code is {otp}. It will
  expire in {N} minutes.` via BulkSMSBD, reusing the same
  `BULKSMSBD_API_KEY` / `BULKSMSBD_SENDER_ID` credentials as
  `/api/send-contact-otp` — set as **Edge Function secrets** (separate
  from the Next.js `.env.local`; must be set via the Supabase
  dashboard's Edge Function secrets panel, since no MCP tool sets
  function secrets).
- Returns `{}` with 200 on success; non-2xx blocks the OTP send and
  surfaces an error to the client from `signUp`/`signInWithPassword`.

Rate limiting: Supabase Auth has built-in SMS rate limiting
(Dashboard → Auth → Rate Limits) that runs before the hook is ever
called — no need to reimplement the app-level limiter from
`/api/send-contact-otp`.

### 2. Dashboard configuration (manual, one-time)

- Auth → Providers → Phone: enable phone auth
  (`GOTRUE_EXTERNAL_PHONE_ENABLED=true`), automatic confirmation OFF
  (`GOTRUE_SMS_AUTOCONFIRM=false`) so the hook actually fires.
- Auth → Hooks → Send SMS: HTTP Endpoint hook pointed at the deployed
  `send-sms-hook` function URL, with the generated
  `SEND_SMS_HOOK_SECRET`.
- These two steps can't be done through any available MCP tool or
  file in this repo — I'll do the parts I can (function + secrets
  guidance) and hand you the exact toggles to flip in the dashboard.

### 3. Postgres trigger fix (migration)

`handle_new_user()` currently derives `username` from
`split_part(email, '@', 1)`, which is NULL for phone signups — every
phone signup would collide on the same fallback username and the
*second* one would fail outright on the `profiles.username` unique
constraint. Migration updates the function to:

- fall back to a phone-derived username (e.g. last digits of
  `new.phone`) when `email` is NULL, and
- populate `profiles.contact_number` from `new.phone` and
  `profiles.phone_verified` from `new.phone_confirmed_at is not null`
  so the profile-settings phone UI reflects a phone-signup account
  correctly from day one, and
- keep existing email-signup behavior unchanged.

### 4. `lib/queries/client/auth.ts`

Add phone variants alongside the existing email functions:

```ts
signUpWithPhone(phone: string, password: string)   // supabase.auth.signUp({ phone, password })
verifyPhoneOtp(phone: string, token: string)        // supabase.auth.verifyOtp({ phone, token, type: 'sms' })
signInSmart(identifier: string, password: string)   // routes to signInWithPassword({ email }) or ({ phone }) by format
```

Phone format validated client- and server-side against the existing
`^\+8801\d{9}$` pattern already used in `/api/send-contact-otp`.

### 5. Signup UI (`SignupClient.tsx`)

Two tabs, **Phone** (default) and **Email**. Phone tab: phone input +
password → `signUpWithPhone` → OTP input step → `verifyPhoneOtp` →
redirect like today's email flow. Email tab: unchanged, today's
`signUp(email, password)`.

### 6. Login UI (`LoginClient.tsx`)

Single input field, no tab/toggle. On submit, detect `@` → treat as
email; otherwise treat as phone (auto-prefix `+880` if the user typed
a local-format number, matching the existing BD-only phone pattern).
Calls `signInSmart`.

### 7. `ensureProfile.ts`

Currently derives `username`/`email` purely from `user.email`. Extend
to also read `user.phone` when `user.email` is null, mirroring the
trigger fix in §3 (this function is the client-side fallback for the
rare case the trigger didn't run).

## Error handling

- Duplicate phone signup → Supabase Auth returns its standard "user
  already registered" error; surfaced the same way the email flow
  already surfaces it today.
- OTP wrong/expired → `verifyOtp` error surfaced inline under the OTP
  input, same UX pattern as the existing profile-settings OTP step.
- BulkSMSBD/network failure inside the hook → non-2xx response bubbles
  up as a generic "couldn't send verification code, try again" on
  `signUp`/`signInWithPassword`.
- SMS hook secret misconfigured → all phone signups fail closed (hook
  returns error) rather than silently skipping verification.

## Testing

- Unit/type-check: `tsc --noEmit` after each component.
- Manual QA: real signup with a real BD phone number, which **spends
  real SMS credit** on the BulkSMSBD account — will confirm with you
  before running that test rather than doing it silently.
- Regression check: existing email signup/login and the existing
  profile-settings phone-verification flow must keep working
  unchanged.

## Out of scope (YAGNI)

- Letting a user add a *second* identifier (e.g. email on a
  phone-created account) from settings — not requested; the existing
  profile-settings OTP flow already covers "add/verify a phone" on an
  email account, its mirror ("add an email") is a separate future ask.
- OAuth/social login changes — untouched.
- Any change to `/api/send-contact-otp` or `/api/confirm-contact-otp`
  — separate feature, untouched.
