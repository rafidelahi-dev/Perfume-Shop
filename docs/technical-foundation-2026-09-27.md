# Technical Foundation Phase — What, How, Why (2026-09-27)

Phase 1 of the 3-phase gap-closure plan in `GOAL.md` ("Must-haves before
daily content" → Technical foundation → Data model → Trust/brand).
This covers search-engine verification, analytics, and ad-pixel tracking.

## 1. Bing Webmaster Tools verification

**What:** Site verified via both the meta-tag method and the XML-file method.

**How:**
- `NEXT_PUBLIC_BING_SITE_VERIFICATION` env var → rendered as
  `<meta name="msvalidate.01">` via Next's `Metadata.verification.other`.
- `BingSiteAuth.xml` added as a static file for the XML-file verification path.

**Why both:** the meta-tag alone initially failed verification because
Vercel/Next served the XML route with a 307 redirect instead of 200,
which Bing's verifier rejects. Keeping both methods live removes the
single point of failure.

## 2. Google Tag Manager (GTM)

**What:** GTM container wired site-wide.

**How:** `NEXT_PUBLIC_GTM_ID` env var gates a `beforeInteractive` script
in the root `<head>` plus the standard `<noscript><iframe>` fallback in
`<body>`.

**Why `beforeInteractive`:** GTM needs to load before hydration so it
can capture early page-load events; `afterInteractive` (used for GA4,
which was already present) is fine for tags that don't need to race
hydration.

## 3. GA4

Already present before this phase — confirmed working, no changes made.

## 4. Meta Pixel + Conversions API

This was the largest and most error-prone piece of the phase.

### 4a. The pixel-type misdiagnosis

**What happened:** the originally wired pixel ID kept failing every
step of Meta's Conversions API (CAPI) setup — the wizard errored with
"An access token failed to be generated" (only offering a paid Stape
gateway as a workaround), and creating a System User for token
generation only ever showed an "Apps" category in the asset-assignment
modal, never Pixels/Datasets.

**Root cause:** the original pixel was actually a **mobile-app-type
dataset**, not a Website Pixel — visible once we opened its Settings
tab and saw Facebook SDK / iOS 14+ attribution / SKAdNetwork
configuration, none of which apply to a website pixel. It had been
created under the wrong category at some point before this phase.

**Fix:** created a brand-new dataset via Events Manager → Connect Data
→ **Web** category (not App, not Offline). That produced a clean pixel
ID whose CAPI wizard worked normally end-to-end. The site was migrated
to this new pixel ID.

**Why this matters for anyone touching this later:** if CAPI setup or
asset assignment ever breaks again, check the pixel's Settings tab
first — an app-type dataset masquerading as a pixel is very easy to
create by accident in Meta's UI and produces exactly this failure mode.

### 4b. Base pixel + noscript fallback

**What:** `NEXT_PUBLIC_META_PIXEL_ID` gates the `fbq('init', ...)` /
`fbq('track', 'PageView')` script (`beforeInteractive`, same reasoning
as GTM) plus a `<noscript><img src="https://www.facebook.com/tr?...">`
fallback for users with JS disabled.

**Why the noscript tag was added:** it was missing from the initial
wiring; Meta's own recommended snippet always includes it, and it's the
only tracking path for no-JS clients.

### 4c. Server-side Conversions API for signup

**What:** `CompleteRegistration` event is sent both client-side (Meta
Pixel `fbq`) and server-side (Graph API), deduplicated via a shared
`event_id`.

**Files:**
- `lib/metaCapi.ts` — server-only helper, hashes email/phone (SHA-256,
  lowercase-trimmed email / digits-only phone) per Meta's requirements,
  posts to `https://graph.facebook.com/v21.0/{pixel_id}/events`.
- `app/api/capi/complete-registration/route.ts` — API route the client
  calls after a successful signup; pulls `client_ip_address` /
  `client_user_agent` from request headers for match-quality.
- `app/(auth)/signup/SignupClient.tsx` — fires `fbq('track',
  'CompleteRegistration', {}, {eventID})` and POSTs to the above route,
  on both the email-signup success path and the phone-OTP-verified
  success path.

**Why server-side at all:** browser-only pixel tracking is lossy — ad
blockers, Safari's ITP, and third-party cookie restrictions all drop a
meaningful fraction of client-side events. CAPI sends the same
conversion from the server, which Meta counts once it's deduplicated.

**Why `event_id` dedup:** without a shared ID, the same signup would be
counted twice (once from the browser pixel, once from the server call).
Meta merges events sharing an `event_id` within a time window, so the
ID is generated client-side (`crypto.randomUUID()`) and passed to both
the `fbq()` call and the API route's POST body.

**Why scoped to signup only (not Contact/Search/ViewContent, etc.):**
explicit scope decision approved mid-session — signup is the one event
with clear commercial intent, and it's the only conversion the CAPI
setup wizard's "Review setup" step needs for the wizard to consider
setup complete. Other events can be added the same way later if a
concrete need arises (e.g. purchase tracking once checkout exists).

**Why the token was retrieved via "Manually implement the API
yourself"** rather than the System User path: the System User route
kept hitting friction (rejected system-user names, missing asset
category from the pixel-type bug above). Meta's wizard offers this as
an equally official, simpler path — walk Select events → Select event
details → Review setup → See instructions → "Manually implement the
API yourself" → "Open implementation guide", which surfaces a working
long-lived access token directly in sample code.

## Env vars touched this phase

All of these are server/build-time env vars, not committed — set in
`.env.local` for local builds and **must also be set in Vercel's
dashboard** (Project → Settings → Environment Variables) for
production, since `.env.local` is gitignored. This tripped up GTM and
Bing earlier in the project; noting it here so it doesn't happen again:

- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_META_PIXEL_ID` (updated to the new Web-category pixel ID)
- `META_CONVERSIONS_API_TOKEN` (server-only secret, never `NEXT_PUBLIC_*`)

`.env.example` documents all of these (values blank) so a fresh clone
knows what to set without seeing secrets.

## Commits

- Bing verification, GTM, structured data, OG images (earlier in phase)
- `eb66930` — Meta Pixel noscript fallback + switch to the new Web pixel
- `886102d` — Meta Conversions API for signup completion

## Still open from this phase

- Confirm on Vercel: env vars updated + redeployed, new pixel firing
  live, and CAPI Test Events tab shows browser + server events matching
  by `event_id` (not yet confirmed against production).

## Next phases (per `GOAL.md`)

2. **Data model** — BD-climate structured fields, numeric rating scale,
   occasion aggregation, BD price-history, fake-spotting guide fields,
   "Notify me / Request a decant" demand capture.
3. **Trust/brand** — verified-buyer badges, named reviewer profiles,
   real review seeding, business paperwork tracking.
