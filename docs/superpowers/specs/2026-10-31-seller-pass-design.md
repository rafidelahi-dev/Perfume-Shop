# Seller Pass: shareable seller identity (design)

Date: 2026-10-31. Status: approved by owner 2026-10-31.

## Intent and why

Sellers like to show off what they have earned. A seller who shares their profile link should send a card that stops the scroll and makes the receiver want one of their own. On the page itself, a seller should feel uplifted by the platform, on a phone first. This is the growth loop for the community: the card is the ad, and earned status is the reason to join and keep working for reviews.

Tie to `docs/GOAL.md`: community and trust first, the shop is the monetization layer.

## Goals

1. A generated link-preview image ("Seller Pass") for every seller profile, shown when the link is pasted into WhatsApp, Messenger or Facebook.
2. A redesigned seller profile page whose header is the same Seller Pass, built for mobile first.
3. Tiers (Silver, Gold, Platinum) earned automatically from reviews, with a config table so thresholds can change without a deploy.
4. A Verified badge and a Founding number.
5. A "Get your card" invitation for visitors who are not members.

## Non-goals

- No change to the URL: the profile stays at `/perfumes/[username]`.
- No paid or bought tiers. No manual tier grants except a freeze/override (below).
- No achievement shelf (option 2 was rejected).
- No change to reviews, ratings or moderation flows beyond reading them.

## Anti-goals (a failure even if it technically works)

- A card that looks empty or embarrassing for a new seller. Nobody should be ashamed to share.
- Any number on the card that a seller can fake or that does not match the profile.
- A preview image that is slow or breaks in WhatsApp/Facebook crawlers.

## Decisions made by the owner

- Direction: share card "A. Seller Pass" (dark and gold membership card), profile "Option 1: Pass on top". Mockups: `.superpowers/brainstorm/27701-1793458104/content/share-card.html` and `profile-mobile.html`.
- The card must render in the real link preview as shown in the mockup.
- Tiers by approved review count and average rating. Counts are high on purpose because 25 reviews is easy in Bangladesh. Below the Silver count there is no tier badge.
  - Silver: 100 reviews. Gold: 150. Platinum: 200.
- Verified: a phone signup is already OTP-confirmed, so it counts as verified, and the contact number is locked to the signup number. WhatsApp, Messenger, Facebook and website links are separate, free-form fields and may differ.
- Founding number: order of signup.
- Short links are not wanted. Keep `/perfumes/[username]`.

## Decisions made by me (owner can override)

- Count thresholds scale with the number of active member profiles (owner decision, "stages"). Each row starts when the member count reaches `min_members`; the row with the highest `min_members` at or below the current count applies:

  | min_members | Silver | Gold | Platinum |
  |---|---|---|---|
  | 0 | 20 | 35 | 50 |
  | 150 | 50 | 75 | 100 |
  | 200 | 100 | 125 | 150 |
  | 201 (final) | 100 | 150 | 200 |

  Rating bars never change: Silver 4.2, Gold 4.4, Platinum 4.5. These rows live in `tier_config`, so they can be edited without a deploy. Note the 200 row only applies at exactly 200 members, as the owner specified; it is config, so it is easy to widen.
- Earned tiers are kept when thresholds rise (owner agreed, my suggestion). Count is an entry bar, rating is a keep bar. Each profile stores its highest earned tier (`tier_floor`). Displayed tier = the better of the tier today's thresholds give and `tier_floor`, provided the seller's current average still clears that tier's rating bar; if the rating falls under the bar the seller drops one tier and `tier_floor` is reset to the computed tier. Sellers who earned a tier under a lower stage show it as "Early Silver/Gold/Platinum" while it is held only because of the floor. A review counts toward a tier only if the reviewer is a distinct account (one review per reviewer per seller).
- Rating bar steps up by tier: Silver 4.2, Gold 4.4, Platinum 4.5 (owner said "more than 4.5" for Platinum; the lower two bars are my proposal because 4.5 at every level punishes good sellers).
- A tier drops if the rating falls under its bar. Rating and count use only reviews where `is_hidden` is false (the existing moderation mechanism).
- Founding # is shown only for the first 100 signups; later members show no founding chip. Number is stable (computed once, stored), not recomputed.
- Admin can freeze a seller's tier (for example after a scam report). Frozen sellers show no tier.
- "Verified" label reuses the existing `profiles.phone_verified` flag and the existing "Verified seller" wording.
- Card for a seller with no tier shows "New seller, building their reputation" plus Verified and Founding chips if they apply.

## Current state (verified in the repo and database)

- `profiles` has: `username`, `display_name`, `avatar_url`, `bio`, `created_at`, `contact_number`, `whatsapp_number`, `messenger_link`, `facebook_link`, `website`, `phone_verified`, `status`, `role`. 22 profiles; 4 have `phone_verified` true.
- A `website` column already exists, but the profile form and public page do not use it yet.
- `phone_verified` is only set by the profile page's "Verify" OTP flow (`/api/send-contact-otp`, `/api/confirm-contact-otp`). Phone signup (`SignupClient.tsx`, `supabase.auth.signUp({ phone })` then `verifyOtp`) does not set it. Signup also allows email and Google, which have no phone.
- `seller_reviews` has `seller_id`, `reviewer_id`, `rating` (smallint), `is_hidden`, `is_flagged`. `get_seller_rating(p_seller_id)` returns count and average over non-hidden reviews.
- Public page: `perfume-mvp/app/perfumes/[username]/page.tsx` (ISR, `revalidate = 300`), with `generateMetadata` that currently uses the avatar as the preview image.
- Existing generated preview images to copy the pattern from: `app/fragrance/[slug]/opengraph-image.tsx`, `app/blog/[slug]/opengraph-image.tsx`.

## What gets built

1. **Database**
   - `tier_config` table: tier name, min reviews, min average. Public read.
   - Founding number: stored on `profiles` (assigned by signup order via `created_at`), first 100 only.
   - Tier freeze: a flag on `profiles` set only by admin.
   - An RPC (for example `get_seller_pass(p_seller_id)`) returning rating count, average, tier, founding number, verified, listing count, member-since year. One source of truth used by both the page and the card.
   - Backfill `phone_verified` from the phone confirmation Supabase already stores for phone signups.
2. **Signup**: after a phone signup is OTP-confirmed, set `phone_verified` true and `contact_number` to the signup phone. Profile form makes `contact_number` read-only for those accounts; email/Google accounts keep the existing Verify flow.
3. **Share card**: `app/perfumes/[username]/opengraph-image.tsx` rendering the Seller Pass at 1200x630 from the RPC data, including the "Get yours free" line. Update `generateMetadata` to use it (Facebook/WhatsApp read `og:image`; keep `twitter:card` as `summary_large_image`).
4. **Profile page**: Seller Pass header, contact buttons (WhatsApp, Messenger, Facebook, call, website), Rate button, Verified and Founding chips, Listings and Reviews tabs, and a sticky "Get your card" bar for logged-out visitors.
5. **Profile form**: expose `website` (validated URL).
6. **Admin**: tier freeze toggle on the seller detail panel.
7. **Docs**: update `docs/WORKFLOWS.md` (tier, Verified, share card flows).

## Constraints

- Next.js 16 and Supabase; keep ISR on the profile page. Tier changes appear within the existing revalidate window.
- Preview image libraries (satori via `next/og`) support limited CSS (flex only) and need font files loaded; avatar images must be fetchable. The image must be checked as a rendered PNG before shipping, and checked against how WhatsApp crawls it.
- Public tier/rating data is computed server side; clients cannot set it.
- Bangla toggle (phase 1, uncommitted) is separate; this work stays English for now.

## Left to the builder

- Exact visual styling, fonts and spacing, following the approved mockups.
- Whether the tier is computed on read or cached in a column, given the seller count (22 now).
- Handling of avatars that are missing, huge or on a blocked host in the card.
- One review per reviewer per seller is already enforced by `UNIQUE (seller_id, reviewer_id)` on `seller_reviews`.

## Open items for the owner

None blocking. Two worth a glance: the lower rating bars (4.2 / 4.4), and Founding limited to the first 100.
