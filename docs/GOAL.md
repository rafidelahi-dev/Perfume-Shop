# Cloud Perfume BD: market, SEO plan, SWOT

Selling perfume online in Bangladesh is a crowded, low-trust, thin-margin
market; the "Fragrantica for Bangladesh" community idea is the only part
with a real moat. Build the community and content first, and treat the
shop as the way it earns money.

## The market and competitors

The perfume-hobby scene in Bangladesh has grown fast since 2020, driven
by Middle Eastern brands (Lattafa, Rasasi, Armaf, Afnan, Maison Alhambra)
that give "designer-like" scents at ৳2,000–6,000, and by decants that let
people try expensive perfumes cheaply. Competition is already dense:

| Competitor | Model | Note |
|---|---|---|
| Perfume Shop BD | Full bottles, 30+ brands, verified-buyer reviews | Already shows BD customer reviews on products |
| Perfumia BD | Bottles + decants, Facebook-led, since 2020 | ~11k Facebook followers, COD nationwide |
| Aromatica, Decant World BD, Branded Perfume BD, Scents Share | Decant specialists | Scents Share already publishes SEO guides targeting BD perfume searches |
| Daraz | Marketplace | Price anchor, and the place buyers fear fakes |
| Hundreds of Facebook/Instagram pages | Social commerce | Where most sales actually happen |

Nobody yet owns structured, Bangladesh-specific fragrance knowledge: how
a scent performs in 35°C and 80% humidity, in an office with AC, in
winter weddings, during Ramadan, on a CNG ride. That is the opening.

## SEO/GEO plan: what works and what doesn't

Listing the most-searched perfumes even when not stocked is a
legitimate, proven tactic (Amazon and Fragrantica both do versions of
it), if each page is genuinely useful. It fails if pages are thin
"out of stock" shells, because Google treats them as low-quality and
visitors bounce.

Make every perfume page worth ranking:

- **Bangladesh climate rating**: longevity and projection in summer,
  monsoon and winter, from BD users.
- **Best occasions in BD context** (office, university, wedding, Jummah,
  date night) and price history in taka.
- **Authenticity guide**: how to spot a fake of this specific bottle
  (batch code, cap, box print). This alone attracts heavy search traffic
  because fear of fakes is the biggest pain in BD.
- Replace "Out of stock" with "Notify me / Pre-order / Request a
  decant". Every click is free demand data telling exactly which
  perfumes to buy next.
- For GEO (being cited by AI assistants), publish clear comparison and
  "best for Bangladesh summer under ৳5,000" pages with facts in plain
  tables; AI tools quote pages like that.

**One strong warning.** Do not post reviews or community opinions as a
fake "regular user" while being the owner. It breaks Facebook and Google
review policies, can fall under Bangladesh's consumer-protection rules
on misleading advertising, and if the community discovers it, the trust
that is the whole moat collapses. Post as "Cloud Perfume Team" openly,
and seed early reviews by giving free decants to 30–50 real enthusiasts
from Facebook perfume groups in exchange for honest reviews.

## Business model

| Revenue line | Margin | Role |
|---|---|---|
| Decants (2–10ml) of hyped perfumes | High (40–70%) | Main early profit; low capital |
| Full bottles of hyped releases | Low (10–20%) and price wars | Traffic and credibility |
| Affiliate/listing fees from other sellers | Very high | Later: become the Amazon-like marketplace |
| Sponsored reviews/brand launches | High | Later, once traffic exists, clearly labelled |

## SWOT

**Strengths**
- Production-grade site already built (Next.js + Supabase)
- Technical SEO skills most perfume sellers lack
- Clear, defensible idea: BD-climate reviews

**Weaknesses**
- Late entrant in a crowded shop market
- Inventory needs capital; perfumes can be damaged by heat
- Community needs constant moderation and content

**Opportunities**
- No one owns BD fragrance data
- Decant subscription boxes ("3 summer scents a month")
- Become a marketplace for vetted sellers

**Threats**
- Fake/grey-market products hurt reputation if careless with suppliers
- Big sellers copy the review idea quickly
- Import duty changes raise bottle prices

## Verdict

Good long-term asset, weak short-term income. Run it as a slow-build
content engine: 3 perfume pages a week, one community post a day,
decants as the cash product. Don't put major capital into full-bottle
inventory until pages rank and "Notify me" data proves demand.

---

# The long-game plan

Think of Cloud Perfume BD as a Bangladeshi perfume database with a shop
attached, not a shop with a blog. The database and the community
compound every month; the shop monetises the trust they build. Get the
foundation right before posting daily — content published on a weak
base gets far less reach.

## Must-haves before daily content

### Technical foundation

- [ ] Clean page structure: one permanent URL per perfume (e.g.
      `/perfume/lattafa/khamrah`), per brand, and per guide; sizes as
      options on the same page, never separate pages.
- [ ] Pages rendered on the server (Next.js: static or server
      rendering), fast on mobile data.
- [ ] Google Search Console and Bing Webmaster Tools set up, XML
      sitemap submitted, robots.txt checked. Several AI search tools
      draw on Bing's index, so Bing matters for AI visibility too.
- [ ] Structured data (schema.org) on every perfume page: `Product`
      with `Offer` (availability set to `InStock`, `OutOfStock` or
      `PreOrder`), `Review` and `AggregateRating` from real reviews
      only, `BreadcrumbList`, `FAQPage`; `Organization` on the
      homepage; `Article` on guides.
- [ ] Open Graph images and titles so links look good when shared on
      Facebook and WhatsApp.
- [ ] Analytics (GA4), Meta Pixel with Conversions API, so later ads
      can use the organic audience.
- [ ] robots.txt allows the major AI crawlers to be cited by (OpenAI,
      Perplexity, Anthropic, Google).

### The perfume data model (the moat)

Facts everyone has: brand, name, year, perfumer, concentration,
fragrance family, top/heart/base notes, sizes.

Facts only Cloud Perfume BD will have: performance in Bangladeshi
summer, monsoon and winter; in an AC office vs outdoors; longevity and
projection votes from Bangladeshi users; best BD occasions (office,
university, wedding, Jummah, date); BD price range in taka updated
monthly; how to spot a fake of this bottle; similar cheaper
alternatives available in BD.

Build these as structured fields, not free text, so "Top 10 for Dhaka
summer" pages can later be computed automatically from real votes.

### Trust and brand basics

- [ ] About page with real face and story, real contact number and
      address, authenticity and return policy.
- [ ] Named author profile for reviews (the tester), showing how
      perfumes are tested in Dhaka conditions.
- [ ] Original photos: bottles in hand, on Dhaka streets and desks.
      Original images rank better, build trust and can't be copyright
      claims.
- [ ] Every description written from scratch; never copy Fragrantica
      or brand text.
- [ ] Review system with "verified buyer" and "owns this perfume"
      badges, and community rules with moderation.
- [ ] Business paperwork: trade licence, and check the Digital
      Business Identity (DBID) registration the Ministry of Commerce
      expects from e-commerce businesses.

### Keyword map

Collect 200–300 searches Bangladeshis actually type, in English, Bangla
and Banglish: "khamrah price in bd", "best perfume for summer in
bangladesh", "original vs fake dior sauvage", "গরমের জন্য ভালো
পারফিউম". Use Google autocomplete, "People also ask", Facebook group
questions and later Search Console data. Assign every search to exactly
one page so pages don't compete with each other.

## How to list perfumes stocked and not stocked

Every perfume gets one permanent page, whatever its stock status. Only
the buying box changes:

| Status | What the buying box shows | Schema availability |
|---|---|---|
| In stock (bottle) | Price, sizes, delivery time, Buy now | `InStock` |
| Decant available | 3ml/5ml/10ml prices, "try before full bottle" | `InStock` |
| Pre-order | Price, advance amount, expected arrival date | `PreOrder` |
| Not stocked | "Notify me when available" + "Request a decant" + expected BD market price range | `OutOfStock` |
| Discontinued | "No longer made" + links to closest alternatives | `Discontinued` |

Rules that keep this honest and strong for SEO:

- Never delete or redirect a page just because stock ran out; the page
  keeps its rankings and captures demand.
- Never show a fake price or fake "only 2 left" urgency on items not
  in stock.
- Page order: summary verdict for Bangladesh → buying box → BD climate
  performance → notes → occasions → fake-spotting guide → reviews →
  similar perfumes → FAQ.
- Start with the top 100 most-searched perfumes in Bangladesh (mostly
  Middle Eastern clones and the designer classics they copy). A
  hundred excellent pages beat two thousand thin ones; Google's spam
  policies target mass-produced, low-value pages.
- Use "Notify me" and "Request a decant" counts as the buying list:
  stock what people are asking for.

## Getting organic reach

### Google search

- Build topic clusters: a pillar guide ("Best perfumes for Bangladesh
  summer 2026", "How to spot fake perfume in Bangladesh", "Middle
  Eastern perfumes guide") linking to all related perfume pages and
  back.
- Publish comparison pages people search for ("Khamrah vs Khamrah
  Qahwa", "Club de Nuit Intense vs Creed Aventus") and a monthly
  price-update page.
- Earn links with original data: a yearly "What Bangladesh wears"
  survey report from community votes is exactly what newspapers'
  lifestyle sections and bloggers will link to.

### AI assistants (GEO)

- Answer questions directly in the first sentence of each section; use
  tables for comparisons and short FAQ blocks. AI tools lift clear,
  factual passages.
- Keep facts consistent everywhere (site, Facebook, Google Business
  Profile, YouTube descriptions); AI systems trust entities they see
  described the same way across the web.
- Get mentioned outside the site: helpful answers in Reddit threads
  (r/bangladesh, r/fragrance), Quora, Facebook groups and YouTube. AI
  answers are shaped by what many sources say, not just by owned
  pages.
- Once a month, ask ChatGPT, Gemini, Perplexity and Claude "best
  perfume for Dhaka summer under ৳5,000" and log whether cited.

### Facebook

- Start a community group ("Fragrance Lovers Bangladesh by Cloud
  Perfume"), not just a page. In Bangladesh, perfume talk happens in
  groups, and groups get far more organic reach than pages.
- Post value, not links: Facebook shows fewer people posts with
  outbound links, so put the link in the first comment.
- Weekly rituals: "Scent of the Day" thread, "Would you wear this in
  Dhaka heat?" polls, monthly Live blind test, decant giveaways in
  exchange for honest reviews.

### Instagram

- Reels first: 15–30 seconds, one idea each ("3 office perfumes under
  ৳3,000 that survive Dhaka traffic", "fake vs real in 20 seconds").
- Carousels for saveable content: note breakdowns, seasonal top 5,
  fake-spotting checklists. Saves and shares drive reach more than
  likes.
- Collab posts with micro-creators (5k–50k followers) in fashion,
  grooming and lifestyle; pay in decants.
- Keep one consistent visual style: same colours, fonts and
  bottle-photo setup.

Repurpose everything: one short video a day goes to Instagram Reels,
Facebook Reels, YouTube Shorts and TikTok.

## Weekly content rhythm

| Frequency | Output |
|---|---|
| Daily | 1 short video (cross-posted), 1 group post or poll |
| Weekly | 3 new or upgraded perfume pages, 1 guide or comparison article, 1 Live or community ritual |
| Monthly | Price-update page, "trending in Bangladesh" list from own data, review of Search Console and AI-citation checks |

## The long game in three phases

1. **Months 0–6: become the reference.** 100 excellent perfume pages,
   own group of 5,000 members, decants as the cash product.
2. **Months 6–18: own the data.** Thousands of Bangladeshi reviews and
   climate votes; auto-generated rankings from real data; invite vetted
   sellers to list (the Amazon-for-perfume vision).
3. **Year 2+: become the institution.** Annual "Cloud Perfume BD
   Awards" voted by the community, brand launch partnerships (clearly
   labelled), curated decant boxes.

Track monthly: Google impressions and clicks, indexed pages, number of
real reviews, group members, returning visitors, "Notify me" requests,
decant orders.

## Things to watch out for

- Fake reviews or posing as a regular user destroys the one thing this
  business sells: trust.
- AI-written bulk pages without real testing are treated as spam; use
  AI to draft, but every page needs real notes and photos.
- Selling anything that can't be proven original. One fake bottle
  exposed in a Facebook group can end the brand; keep supplier invoices
  and batch-code photos.
- Heat damage in delivery during summer; pack well and say so.
- Consistency beats bursts. Search and community reward 12 months of
  steady output far more than 2 months of daily posting followed by
  silence.
