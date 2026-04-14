import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Help Center",
  robots: { index: false, follow: false },
};

export default function HelpCenterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
