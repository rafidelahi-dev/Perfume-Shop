# Cloud Perfume BD — What We Built, and the Daily Playbook

**Read alongside `docs/GOAL.md`** — that file is the strategy; this file is
the day-to-day execution of it, plus a snapshot of what the platform
actually has right now (2026-09-29).

---

## 1. What the site already had (before the trust/brand phase)

- Next.js + Supabase production stack, server-rendered pages, fast on
  mobile.
- Perfume catalog: **252 perfume pages already live** (`/fragrance/[slug]`),
  each with note pyramid, description, similar-perfumes block.
- Seller listings system: users can list bottles/decants for sale
  (`listings` table), with search/filter by brand.
- Blog/guides system with admin moderation queue.
- Superadmin dashboard: sellers, listings, blog, perfumes management.
- Price history tracking per perfume, shown as a trend on the page.
- Out-of-stock demand capture: "Notify me" / "Request a decant" buttons
  that log real demand instead of just showing a dead "out of stock" page.
- Authenticity/fake-spotting guide fields on the perfume schema (batch
  code, cap, box-print checks — not yet filled in for most perfumes).
- SEO technical foundation: structured data (schema.org), OG images,
  analytics wiring.

## 2. What we just added (trust/brand phase, this session)

- **Reviews schema + moderation**: `reviews` table with rating,
  free-text, "owns bottle" self-attestation, longevity, climate
  (summer/monsoon/winter), environment (AC office / outdoors / mixed),
  when-to-wear occasions. Public reads go through a `get_perfume_reviews`
  SECURITY DEFINER RPC that never exposes moderation-internal fields.
- **Public review display** on every fragrance page: rating emoji, "Owns
  bottle" badge, longevity/climate/environment chips, review text and
  photos. This is the Bangladesh-climate performance data `GOAL.md` calls
  the actual moat — no competitor has it structured like this.
- **Reviewer dashboard**: reviewers see their own reviews and, if a
  moderator flags one, a visible "Flagged by moderators: `<reason>`"
  banner so they know what to fix. Flagging does **not** hide the review
  from the public page — only an explicit hide/delete does. This was
  verified end-to-end this session (flag → still public → unflag →
  delete → gone everywhere).
- **Superadmin review moderation**: `/superadmin/reviews` — search,
  filter by status (active/flagged/hidden), flag with a reason, unflag,
  hard delete. Sidebar shows a live flagged-count badge.
- All of this mirrors the existing listings-moderation pattern exactly
  (same admin auth guard, same UI components), so it's one consistent
  system to operate, not two.

## 3. Where that leaves the site (honest numbers, live DB)

| Metric | Current |
|---|---|
| Perfume catalog pages | 252 |
| Verified perfumes (authenticity guide filled in) | 0 |
| Real seller listings | 14, all from 1 seller |
| Real reviews | 0 |
| "Notify me" / demand-request signals logged | 0 |

**Read this plainly**: the engine is world-class for its stage — the
catalog is already past the "top 100" target `GOAL.md` set, the schema
captures data no BD competitor captures, and moderation is real. But it
is an empty engine. Nobody has driven it yet. Zero reviews and zero
demand signals means the "own the BD fragrance data" moat doesn't exist
yet — it only exists once real people leave real data. That's what the
daily playbooks below are for.

---

## 4. Daily playbook — Superadmin account

You are not "running a shop" here. You are the person who keeps the
content engine honest, seeds it until the community can carry it, and
watches what people are actually asking for. Roughly 30–45 min/day.

**Every day:**
1. **Check `/superadmin/reviews`.** Any new reviews to moderate? Flag
   anything that looks fake, off-topic, or abusive, with a real reason
   (the reviewer sees it). Do not flag a review just because it's
   negative — negative-but-real reviews are the trust asset.
2. **Check demand signals** (the `demand_requests` table, or its future
   admin page): which perfumes are people clicking "Notify me" /
   "Request a decant" on? That list is your buy list. Sourcing decisions
   should follow this data, not guesswork.
3. **Fill in one authenticity/fake-spotting guide** on a perfume that
   doesn't have one yet (batch code location, cap details, box print).
   This is currently 0/252 — it's explicitly named in `GOAL.md` as the
   single highest-search-intent content type in this market ("original
   vs fake"). One a day gets you to full coverage in under a year; a
   good day gets you three.
4. **Post as "Cloud Perfume Team"**, never as a fake regular user, if
   you're seeding early content. `GOAL.md` is explicit: faking reviews
   as a regular user breaks platform policy and, if discovered, kills
   the trust this whole business is built on. Instead, give free decants
   to 30–50 real enthusiasts from BD perfume Facebook groups in exchange
   for honest reviews — that's how you get from 0 real reviews to 50
   fast, without lying.
5. **Once a week**, not daily: check Google Search Console (once it's
   wired up) for new impressions/clicks, and once a month, ask
   ChatGPT/Gemini/Perplexity "best perfume for Dhaka summer under
   ৳5,000" and note whether Cloud Perfume BD gets cited.

**On adding more perfume catalog pages** (this directly answers your
"list 100, have 30" question below): expanding the catalog past 252 is
correct and matches `GOAL.md`'s explicit strategy — listing the
most-searched perfumes even when nobody has them in stock yet is a
proven tactic (Amazon, Fragrantica both do it), **as long as every page
has real content**: notes, BD-climate expectations once reviews exist,
a fake-spotting guide, similar-perfume links. A perfume page with
nothing but "not in stock" is what Google calls a thin/spam page and
will actively hurt you. Right now there's no "add perfume" button in
the superadmin UI yet (perfumes are added via direct database insert) —
that's a real gap; if you want to add catalog entries yourself
regularly, say so and it's a small admin feature to build. Until then,
new catalog perfumes are a request to make in this session, not a daily
UI task.

---

## 5. Daily playbook — Seller account (your other login)

This is the account that actually sells. Its job is completely
different from the superadmin account: **the superadmin grows the
catalog and community; the seller account only ever represents real,
sellable inventory.**

### Answering your stockout-listing question directly

**Don't create fake "out of stock" listings as the seller. That's not
what listings are for, and the platform doesn't need you to do it.**

Here's why, concretely, from how the data model actually works:
- A **listing** (what you post as a seller) means "I am selling this
  right now." There's no "mark my own listing as out of stock" field —
  a listing is inherently a live offer. Posting 70 fake listings for
  perfumes you don't have and can't fulfil is just noise in your own
  inventory list; it doesn't create SEO value, because...
- ...the **perfume catalog page** (`/fragrance/[slug]`) already exists
  independently of any listing. It's a superadmin/catalog-level object.
  When a perfume has zero listings, the page automatically shows
  "Notify me" / "Request a decant" instead of a dead page — that's the
  legitimate version of what you're describing, and it's *already built
  and live*. You don't need to fake anything to get it; it happens
  automatically the moment a catalog page exists with no listings.
- Faking listings as a seller also directly collides with the one hard
  rule in `GOAL.md`: never show fake stock/urgency, never misrepresent
  what you can actually deliver. On a platform whose entire pitch is
  "we help you avoid fakes and fraud," a seller running fake listings is
  the exact failure mode that ends the brand if a buyer in a Facebook
  group notices a "sold" item never actually ships.

**So the split of responsibility is:** wanting more perfume *pages* to
exist (even unstocked) is a **catalog/superadmin** decision — expanding
which of the 252+ perfumes get pages. Wanting more *listings* to exist
is a **seller** decision, and it should only ever track real stock you
can actually fulfil.

### What to actually do daily as the seller, ~20–30 min/day:

1. **List only what you actually have** — your real 25–30 — with
   accurate price, size (full bottle vs decant ml), and photos taken
   yourself (original photos rank better and can't be copyright-claimed
   — `GOAL.md`). Currently only 14 of your presumed ~25–30 are listed;
   close that gap first, it's free.
2. **Offer decants, not just full bottles**, on anything you can
   portion. Decants are the highest-margin, lowest-capital product per
   `GOAL.md`'s business model table (40–70% margin vs 10–20% on full
   bottles) and the easiest way to turn "Notify me" demand into a sale
   without buying a full case up front.
3. **Check the demand-request list** (same one the superadmin checks) —
   if 5 people clicked "Notify me" on a perfume you can actually source,
   go get it and list it. That's real, data-driven restocking, not a
   guess.
4. **Update price/stock the moment something sells or the price
   changes.** Stale listings (wrong price, sold-out-but-still-shown)
   are exactly the kind of small dishonesty that erodes trust fastest —
   worse for a small account than for a big one, because you have less
   reputation to absorb a bad experience.
5. **Leave real reviews on perfumes you've actually tried**, using your
   *personal* account if you have one separate from the seller account,
   with "owns bottle" checked truthfully. Every real review you add is
   catalog data that makes the whole site rank better — that benefits
   your own listings too, since better-ranking pages send more buyers
   to whoever's listing sits on them.

---

## 6. Daily organic playbook — Facebook & Instagram (no ad spend)

Straight from `GOAL.md`'s weekly rhythm, broken into an actual daily
checklist. Budget: ~30–40 min/day, done at a consistent time (evening,
when BD scrolling peaks, works well).

**Every single day:**
1. **One short video (15–30s), one idea, cross-posted everywhere**
   (Instagram Reels, Facebook Reels, YouTube Shorts, TikTok — one film,
   four uploads). Ideas that work: "3 office perfumes under ৳3,000 that
   survive Dhaka traffic," "spot the fake in 20 seconds," "does this
   survive a CNG ride in July." Rotate through your real 25–30 bottles;
   you have months of content before repeating.
2. **One post or poll in your Facebook group** (start it if it doesn't
   exist yet — `GOAL.md` is explicit that groups outperform pages for
   organic reach in this market). "Scent of the day," "would you wear
   this in Dhaka heat," genuinely asking, not selling.
3. **Link placement rule**: never put the shop link in the main
   Facebook post — Facebook suppresses reach on posts with outbound
   links. Put the link in the first comment instead.

**Weekly, on top of the daily items:**
- 3 new or upgraded perfume pages (superadmin side — pairs with the
  fake-spotting-guide task above).
- 1 longer guide or comparison post ("Khamrah vs Khamrah Qahwa") linked
  from the group.
- 1 Live session or community ritual (blind test, giveaway in exchange
  for an honest review).

**Ongoing, not scheduled:**
- Keep one visual style — same colors, fonts, bottle-photo setup —
  across every platform so the brand is recognizable at a glance.
- Reply to every comment and DM; groups reward accounts that actually
  talk back.
- The moment you have 5k+ Instagram/Facebook reach on a niche
  fashion/grooming account, offer a decant-for-post collab instead of
  cash — cheaper and more credible than a paid ad at this stage.

**What not to do**, because it actively backfires per `GOAL.md`: don't
post as a fake customer, don't buy followers, don't burst-post for two
weeks then go silent — twelve months of steady daily output beats two
months of daily posting followed by silence, for both Facebook's
algorithm and Google's crawl pattern.
