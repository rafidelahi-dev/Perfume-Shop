import Header from "@/components/Header";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | CloudPerfumeBD",
  description: "Learn how CloudPerfumeBD collects, uses, and protects your personal information.",
}

type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
}

function Section({ id, title, children }:SectionProps){
  return(
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-[#111]">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-black/70 sm:text-base">
        {children}
      </div>
    </section>
  )
}

export default function Page() {
  const lastUpdated = "December 23, 2025";

  const sections = [
    { id: "overview", label: "Overview"},
    { id: "data-we-collect", label: "Data We Collect"},
    { id: "how-we-use", label: "How We Use Data" },
    { id: "sharing", label: "Sharing & Disclosure" },
    { id: "cookies", label: "Cookies" },
    { id: "security", label: "Security" },
    { id: "your-rights", label: "Your Rights" },
    { id: "third-parties", label: "Third-Party Links" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact" },
  ]
  return (
    <main className="min-h-screen bg-[#fbf7ef]">
      <Header/> 
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70">
                Legal
                <span className="h-1 w-1 rounded-full bg-black/30" />
                Last updated: {lastUpdated}
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#111] sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70 sm:text-base">
                This policy explains what information we collect, why we collect it,
                and how you can control your privacy when using CloudPerfumeBD.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/terms"
                  className="rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm text-black/80 hover:bg-white transition"
                >
                  View Terms of Use
                </Link>
                <Link
                  href="/help-center"
                  className="rounded-full bg-[#111] px-4 py-2 text-sm text-white hover:opacity-90 transition"
                >
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Optional image card (placeholder) */}
            <div className="w-full sm:w-[320px]">
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-black/10 bg-[#fffdf7]">
                  <Image 
                  src="/privacy-hero.png"
                  alt="Privacy & Data protection illustration"
                  fill
                  className="object-contain"
                  priority
                  />
                </div>
                <p className="mt-3 text-xs text-black/60 text-center">
                  Your privacy and data security matter to us.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          {/* Side nav */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                On this page
              </p>
              <nav className="mt-3 flex flex-wrap gap-2 lg:flex-col">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-xs text-black/70 hover:bg-white transition"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main article */}
          <article className="space-y-10">
            <Section id="overview" title="1. Overview">
              <p>
                CloudPerfumeBD is a community-driven perfume
                marketplace where users can browse listings, create profiles, and
                contact sellers directly. This Privacy Policy describes how we
                collect and use information when you use our website, services,
                and features, AKA the “Service”.
              </p>
              <p className="mt-3">
                By using the Service, you agree to this policy. If you do not
                agree, please stop using the Service.
              </p>
            </Section>

            <Section id="data-we-collect" title="2. Data We Collect">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <b>Account info:</b> email, username, display name.
                </li>
                <li>
                  <b>Profile details (optional):</b> contact number, WhatsApp number,
                  Facebook/Messenger link, website, location, about yourself, profile photo.
                </li>
                <li>
                  <b>Listings & content:</b> perfume listings, images, descriptions,
                  prices, and other user-submitted content.
                </li>
                <li>
                  <b>Technical data:</b> basic request information such as IP address
                  and browser type may be processed automatically by our hosting,
                  authentication, or security infrastructure for performance and
                  abuse prevention.
                </li>
              </ul>

              <div className="mt-5 rounded-xl border border-black/10 bg-white/60 p-4">
                <p className="text-sm text-black/70">
                  <b>Note:</b> We encourage users to share contact details only if they
                  are comfortable. Buyers should always practice safe trading.
                </p>
              </div>
            </Section>

            <Section id="how-we-use" title="3. How We Use Your Data">
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide login, account management, and profile features.</li>
                <li>Show listings and seller information on public pages.</li>
                <li>Improve features, reliability, and security.</li>
                <li>Respond to support requests and user feedback.</li>
                <li>Prevent spam, abuse, fraud, and unauthorized access.</li>
              </ul>
            </Section>

            <Section id="sharing" title="4. Sharing & Disclosure">
              <p>
                We do <b>not</b> sell your personal information. We may share limited
                data only when necessary:
              </p>
              <ul className="mt-3 list-disc pl-5 space-y-2">
                <li>
                  <b>Service providers:</b> hosting, storage, analytics, email/SMS tools
                  used to operate the Service.
                </li>
                <li>
                  <b>Legal requirements:</b> if required by law or to protect users
                  and our platform.
                </li>
                <li>
                  <b>Business changes:</b> if we merge, acquire, or transfer assets,
                  user data may be transferred as part of the transaction.
                </li>
              </ul>
            </Section>

            <Section id="cookies" title="5. Cookies">
              <p>
                We may use cookies (small files stored on your device) to keep you
                logged in, remember preferences, and understand which parts of the
                site are most helpful. You can disable cookies in your browser, but
                some features may not work correctly.
              </p>
            </Section>

            <Section id="security" title="6. Security">
              <p>
                We use reasonable safeguards designed to protect your data (such as
                secure authentication and access controls). However, no system is
                100% secure. Please use strong passwords and avoid sharing sensitive
                information publicly.
              </p>
            </Section>

            <Section id="your-rights" title="7. Your Rights & Choices">
              <ul className="list-disc pl-5 space-y-2">
                <li>Update or correct your profile information anytime.</li>
                <li>Remove optional contact info (WhatsApp, Messenger, etc.).</li>
                <li>Delete your account whenever you want.</li>
                <li>Control cookies through browser settings.</li>
              </ul>
            </Section>

            <Section id="third-parties" title="8. Third-Party Links">
              <p>
                Our site may contain links to external websites or services
                (e.g., social platforms: whatsapp, facebook, messenger, seller's personal website). We are not responsible for the privacy
                practices of those websites. Please review their policies before
                sharing information.
              </p>
            </Section>

            <Section id="changes" title="9. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we do, we
                will update the “Last updated” date at the top of this page. Please
                review it periodically.
              </p>
            </Section>

            <Section id="contact" title="11. Contact">
              <p>
                If you have any questions or concerns about privacy, contact us at:
              </p>
              <div className="mt-4 rounded-xl border border-black/10 bg-white/70 p-4">
                <p className="text-sm text-black/80">
                  Email:{" "}
                  <a
                    className="underline"
                    href="mailto:support@cloudperfumebd.com"
                  >
                    support@cloudperfumebd.com
                  </a>
                </p>
              </div>
            </Section>

            <div className="pt-6">
              <Link
                href="/"
                className="text-sm text-black/60 hover:text-black underline underline-offset-4"
              >
                ← Back to home
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}


