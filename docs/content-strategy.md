# Content Strategy — Hawas Cluster (and template for future clusters)

Distilled from the raw ChatGPT/NotebookLM session (`docs/concept/analysis.md`, 2026-10-13).
Ties to `docs/GOAL.md`: community + BD-climate content first, shop is the monetization layer.

## 1. Topic cluster

| Role | Post | Search intent | Primary keyword (EN, how BD users search) |
|---|---|---|---|
| Pillar | Hawas OG vs Ice vs Ice Freeze — which ONE to buy | Commercial investigation | `hawas ice vs ice freeze` / `which hawas to buy` |
| Spoke | Hawas Ice vs Ice Freeze — upgrade or different perfume? | Comparison | `hawas ice freeze review` |
| Spoke | How to spot fake Rasasi Hawas Ice in Bangladesh | Safety / trust | `fake hawas ice` / `hawas ice original vs fake` |

Rules:
- Pillar and spoke 1 overlap heavily. Give each a different primary keyword and cross-link both ways, otherwise they cannibalize each other.
- Every spoke links to the pillar and to the relevant `/fragrance/...` page.
- Authenticity post links to seller-safety advice, not to a specific shop as "the safe one" (liability).

## 2. Claims policy (what the AI drafts got wrong)

Do NOT publish as fact:
- "8–10+ hours" longevity for any Hawas. Say "reviewers report long-lasting; varies by skin/weather".
- "4–5 hours" for Ice Freeze. Invented number; sources only said "moderate".
- "Ice Freeze is a Louis Vuitton Afternoon Swim clone". Reviewer interpretation, not official. Write "several reviewers compare it to...".
- "Hawas Ice removes watery notes". Contradicts the official iced marine accord.
- OG "launched 2015" and "Invictus Aqua style". Unverified.
- "Fake Hawas Ice is everywhere in BD" / "yes, fakes are sold in the BD market". No evidence given.
- Box clues (butterfly/snake-skin pattern depth, embossed top). One reviewer, genuine-bottle provenance unclear, easy for counterfeiters to fix. If used: attribute, date it ("as of Oct 2026"), mark not definitive.
- Source tables that cite unrelated videos (the Hawas Ice row cites a "Sanaya vs Sanaya 40" video — hallucinated citation).

Official notes (per ChatGPT check, verify on Rasasi / Fragrantica before publishing):
- Hawas Ice: apple, lemon, bergamot, star anise → plum, orange blossom, cardamom, iced marine accord.
- Ice Freeze: orange, mandarin, bergamot → ginger, mint, lily of the valley.

## 3. What makes our version better than the YouTube summaries

The three drafts were paraphrased YouTube reviews. Anyone with NotebookLM can make them. Our edge:
- First-hand BD testing: own photos/video of real bottles, spray tests in BD heat, wear-time log. Even a short "tested by us" box.
- Live data from our own site: current listings and prices (`/fragrance`), instead of "price in Bangladesh" keyword with no price.
- Credit and link source reviewers.
- A clear single verdict. The pillar draft ended "Ice or OG" for a question that asked for ONE.

## 4. Per-post targets (cleaned from drafts)

Bangla text is wider than Latin in search snippets: keep Bangla title ≤ ~45 chars, meta description ≤ ~100 Bangla chars (Google truncates by pixel width, not by count).

| Post | Slug | Title (draft) |
|---|---|---|
| Pillar | `rasasi-hawas-og-vs-ice-vs-ice-freeze-comparison-bangladesh` | Rasasi Hawas OG বনাম Ice বনাম Ice Freeze: কোনটা কিনবেন? |
| Spoke 1 | `rasasi-hawas-ice-vs-ice-freeze-comparison-bangladesh` | Hawas Ice বনাম Ice Freeze: নতুনটা কি Upgrade? |
| Spoke 2 | `how-to-spot-fake-rasasi-hawas-ice-bangladesh` | Fake Hawas Ice চিনবেন কীভাবে? |

Slugs must be written by hand in English: the editor's `toSlug` strips non `a-z0-9`, so a Bangla title gives an empty slug.

## 5. Page template for comparison posts

1. Answer-first verdict in first paragraph.
2. Side-by-side table (needs table support in editor).
3. Opening / drydown / performance, each attributed ("reviewers report").
4. BD weather section, labelled as reasoned suggestion vs local test.
5. "Already own X?" section.
6. Who should buy which (decision table).
7. FAQ (3–5).
8. Sources + "last updated" line.
9. CTA to comment/share. Social copy (FB, IG caption, carousel, reel) written after the blog, never before.

## 6. Site improvements (status)

Items 5 = inline image alt prompt on upload (cover alt still = title). Item 6 = card read time removed, post page now computes it from content.

| # | Item | Status |
|---|---|---|
| 1 | Separate `meta_title` / `meta_description` (fallback title/excerpt) + SERP preview + char counters | done 2026-10-13 |
| 2 | Table support in editor + renderer + prose styling | done 2026-10-13 |
| 3 | Remove H1 button from editor (page already renders title as H1) | done 2026-10-13 |
| 4 | `lang="bn"` on article body, `og:locale` | done 2026-10-13 |
| 5 | Alt text for cover and inline images | done 2026-10-13 |
| 6 | Fix `readTime` (counts excerpt words, not content) in `BlogPostCard.tsx` | done 2026-10-13 |
| 7 | Related posts (by shared fragrance/tag/category) + featured-fragrance cards with live prices + author box + last-updated | done 2026-10-13 |
| 8 | FAQ field + FAQPage JSON-LD (low Google rich-result value now; helps AI answer engines) | done 2026-10-13 |
| 9 | Internal-only fact-check notes (table `blog_post_internal_notes`, RLS on, service role only) | done 2026-10-13 |
