import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Cloud PerfumeBD — questions about listings, orders, or the community. We reply within 24 hours.",
  alternates: { canonical: "https://www.cloudperfumebd.com/contact-us" },
};

export default function ContactUsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">
              Support
            </p>
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-3">
              Contact Us
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Questions about a listing, an issue with your account, or feedback
              on the site — we read everything and reply within 24 hours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-[#d4af37]/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#d4af37]/10 text-[#d4af37]">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-[#1a1a1a]">
                Email us
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Best for account issues, partnership inquiries, or anything
                detailed.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#1a1a1a] group-hover:text-[#d4af37] transition-colors">
                {SUPPORT_EMAIL} <ArrowRight className="h-4 w-4" />
              </span>
            </a>

            <Link
              href="/help-center"
              className="group rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-[#d4af37]/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#d4af37]/10 text-[#d4af37]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-[#1a1a1a]">
                Help Center form
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Report a problem, ask a question, or send feedback — goes
                straight to our support inbox.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#1a1a1a] group-hover:text-[#d4af37] transition-colors">
                Open the form <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
