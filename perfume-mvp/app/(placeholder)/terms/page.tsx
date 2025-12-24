"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Section = {
  id: string;
  title: string;
}

type ArticleSectionProps = {
  id: string,
  title: string,
  children: React.ReactNode,
}

const BRAND = "Cloud PerfumeBD";
const SUPPORT_EMAIL = "support@cloudperfumebd.com";
const LAST_UPDATED = "December 23, 2025";

export default function Page(){
  const sections : Section[] = useMemo(() => [
    { id: "overview", title: "Overview"},
    { id: "eligibility", title: "2. Eligibility" },
    { id: "accounts", title: "3. Accounts & Profiles" },
    { id: "marketplace", title: "4. Marketplace Rules (Listings & Sellers)" },
    { id: "buyer-safety", title: "5. Buyer Safety & Dealing Caution" },
    { id: "payments", title: "6. Payments, Prices, Refunds" },
    { id: "prohibited", title: "7. Prohibited Activities" },
    { id: "content", title: "8. User Content & License" },
    { id: "ip", title: "9. Intellectual Property" },
    { id: "privacy", title: "10. Privacy" },
    { id: "third-party", title: "11. Third-Party Links & Services" },
    { id: "disclaimer", title: "12. Disclaimers" },
    { id: "liability", title: "13. Limitation of Liability" },
    { id: "indemnity", title: "14. Indemnity" },
    { id: "termination", title: "15. Termination" },
    { id: "changes", title: "16. Changes to These Terms" },
    { id: "contact", title: "17. Contact" },
  ], []);

  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "overview");

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
      .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)) [0];
      
      if (visible?.target?.id) {
        setActiveId(visible.target.id);
      }
    },{
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: [0.1, 0.2, 0.3, 0.4, 0.5]
    }
  );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections])

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <Header />
      {/* Hero */}
      <header className="border-b border-black/10 bg-gradient-to-br from-[#f9f6ef] via-[#f5f1e8] to-[#efe9dc]">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12">
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[#111]">
            Terms of Use
          </h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-black/70">
            These Terms govern your access to and use of {BRAND}, including browsing,
            listing, and contacting sellers. Please read carefully.
          </p>
          <p className="mt-2 text-xs text-black/50">Last updated: {LAST_UPDATED}</p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* ✅ Feature: Sticky side nav for fast section jumping */}
          <aside className="lg:sticky lg:top-24 h-max">
            <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#111]">On this page</p>
                <a
                  href="#overview"
                  className="text-xs text-black/60 hover:text-black underline"
                >
                  Top
                </a>
              </div>

              <nav className="mt-3 flex lg:block gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {sections.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={[
                        "whitespace-nowrap lg:whitespace-normal block text-sm rounded-xl px-3 py-2 transition",
                        active
                          ? "bg-[#fff6dc] border border-[#d4af37]/40 text-[#111]"
                          : "text-black/70 hover:text-[#111] hover:bg-black/5",
                      ].join(" ")}
                    >
                      {s.title}
                    </a>
                  );
                })}
              </nav>

              <div className="mt-4 text-xs text-black/60">
                Looking for privacy info?{" "}
                <Link href="/privacy-policy" className="underline hover:text-black">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </aside>

          <section className="space-y-10">
            {/* NOTE:
              ✅ Feature: scroll-mt prevents headings from hiding under your fixed header.
              Adjust "scroll-mt-24" if your header is taller.
            */}

            <ArticleSection id="overview" title="1. Overview">
              <p>
                Welcome to {BRAND}. By accessing or using our website/app (the “Service”),
                you agree to be bound by these Terms of Use (“Terms”). If you do not agree,
                do not use the Service.
              </p>
              <p className="mt-3">
                {BRAND} is a marketplace-style platform where users can discover listings
                and contact sellers directly (via WhatsApp, Messenger, or other
                contact details a seller chooses to share).
              </p>
            </ArticleSection>

            <ArticleSection id="eligibility" title="2. Eligibility">
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be legally able to form a contract in your jurisdiction.</li>
                <li>You are responsible for ensuring your use complies with local laws.</li>
                <li>
                  If you use the Service on behalf of an organization, you confirm you have
                  authority to bind that organization.
                </li>
              </ul>
            </ArticleSection>

            <ArticleSection id="accounts" title="3. Accounts & Profiles">
              <ul className="list-disc pl-5 space-y-2">
                <li>You are responsible for your account credentials and activity.</li>
                <li>You must provide accurate information and keep it updated.</li>
                <li>
                  You agree not to impersonate others or misrepresent your identity or listings.
                </li>
              </ul>
              <p className="mt-3">
                Some profile fields (like WhatsApp number or Messenger link) are optional.
                If you choose to share them, you consent to other users seeing those details.
              </p>
            </ArticleSection>

            <ArticleSection id="marketplace" title="4. Marketplace Rules (Listings & Sellers)">
              <p>
                Sellers are responsible for the accuracy of their listings (brand, condition,
                authenticity claims, photos, and pricing). Buyers should ask questions and
                verify details before completing any deal.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>No misleading photos or false claims.</li>
                <li>No prohibited items or illegal sales.</li>
                <li>Respect other users; no harassment or spam.</li>
              </ul>
            </ArticleSection>

            <ArticleSection id="buyer-safety" title="5. Buyer Safety & Dealing Caution">
              <p>
                {BRAND} does not guarantee that a seller will share contact details, respond,
                or complete a transaction. If a seller has not shared contact details, you
                should be cautious and avoid sending money without proper verification.
              </p>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900 font-medium">Safety reminder</p>
                <p className="mt-1 text-sm text-amber-800">
                  Meet in safe public places when possible, verify product condition, and do not
                  share sensitive information unnecessarily.
                </p>
              </div>
            </ArticleSection>

            <ArticleSection id="payments" title="6. Payments, Prices, Refunds">
              <p>
                Unless explicitly stated otherwise, {BRAND} is not a payment processor. Payments
                and delivery/meetups are generally arranged directly between buyer and seller.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>Prices are set by sellers and may change at any time.</li>
                <li>
                  Refunds/returns (if any) are handled between buyer and seller unless {BRAND}
                  introduces an official escrow or payment feature in the future.
                </li>
              </ul>
            </ArticleSection>

            <ArticleSection id="prohibited" title="7. Prohibited Activities">
              <ul className="list-disc pl-5 space-y-2">
                <li>Fraud, scams, or deceptive behavior.</li>
                <li>Harassment, hate speech, or threats.</li>
                <li>Attempting to hack, scrape, reverse-engineer, or disrupt the Service.</li>
                <li>Uploading malware or using automated bots without permission.</li>
                <li>Violating intellectual property rights or posting stolen content.</li>
              </ul>
            </ArticleSection>

            <ArticleSection id="content" title="8. User Content & License">
              <p>
                “User Content” includes text, images, listings, reviews, and profile info you submit.
                You keep ownership of your User Content, but you grant {BRAND} a license to host,
                display, and distribute it as needed to operate and promote the Service. (This is
                a common marketplace/legal pattern.)
              </p>
              <p className="mt-3">
                You represent that you have the rights to post your User Content and that it does
                not violate any laws or third-party rights.
              </p>
            </ArticleSection>

            <ArticleSection id="ip" title="9. Intellectual Property">
              <p>
                The Service, including our branding, UI, code, and design, is owned by {BRAND} or
                its licensors. You may not copy, modify, distribute, or create derivative works
                from our content without permission (except where allowed by law).
              </p>
            </ArticleSection>

            <ArticleSection id="privacy" title="10. Privacy">
              <p>
                Our Privacy Policy explains how we collect and use information. By using the Service,
                you consent to our data practices as described there.
              </p>
              <p className="mt-3">
                <Link href="/privacy-policy" className="underline text-[#111] hover:text-black/70">
                  Read the Privacy Policy
                </Link>
              </p>
            </ArticleSection>

            <ArticleSection id="third-party" title="11. Third-Party Links & Services">
              <p>
                The Service may include links to third-party sites (example: WhatsApp, Facebook/Messenger).
                We are not responsible for third-party content, policies, or actions. Your use of those
                services is subject to their own terms.
              </p>
            </ArticleSection>

            <ArticleSection id="disclaimer" title="12. Disclaimers">
              <p>
                The Service is provided “as is” and “as available.” We do not guarantee uninterrupted
                access, error-free operation, or that listings are accurate, authentic, or safe.
              </p>
            </ArticleSection>

            <ArticleSection id="liability" title="13. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, {BRAND} will not be liable for indirect,
                incidental, special, consequential, or punitive damages, or for any loss of profits,
                data, goodwill, or other intangible losses arising from your use of the Service.
                (This kind of clause is standard in marketplace terms.)
              </p>
            </ArticleSection>

            <ArticleSection id="indemnity" title="14. Indemnity">
              <p>
                You agree to defend, indemnify, and hold harmless {BRAND} from any claims, damages,
                liabilities, and expenses (including reasonable legal fees) arising from your use
                of the Service, your User Content, or your violation of these Terms.
              </p>
            </ArticleSection>

            <ArticleSection id="termination" title="15. Termination">
              <p>
                We may suspend or terminate your access if you violate these Terms, create risk for
                other users, or misuse the Service. You may stop using the Service at any time.
              </p>
            </ArticleSection>

            <ArticleSection id="changes" title="16. Changes to These Terms">
              <p>
                We may update these Terms from time to time. The “Last updated” date shows when the
                latest changes were made. Continuing to use the Service after changes means you accept
                the updated Terms.
              </p>
            </ArticleSection>

            <ArticleSection id="contact" title="17. Contact">
              <p>
                Questions about these Terms? Email us at{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </ArticleSection>
          </section>
        </div>
      </main>
    </div>
  )
}

function ArticleSection({
  id, title, children
} : ArticleSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl md:text-2xl font-semibold text-[#111]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm md:text-base text-black/75 leading-relaxed">
        {children}
      </div>
    </section>
  )
}