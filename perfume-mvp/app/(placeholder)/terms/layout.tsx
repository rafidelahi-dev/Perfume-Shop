import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Read the Terms of Use for Cloud PerfumeBD — the rules governing your access to and use of Bangladesh's community-driven perfume marketplace.",
  alternates: { canonical: "https://cloudperfumebd.com/terms" },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
