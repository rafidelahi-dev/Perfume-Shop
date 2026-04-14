import type { Metadata } from "next";
import UnderConstruction from '@/components/UnderConstruction';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <UnderConstruction />;
}
