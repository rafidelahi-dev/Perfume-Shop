import { Suspense } from "react";
import PerfumesPage from "./components/PerfumePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Perfumes — Buy & Sell Fragrances in Bangladesh",
  description:
    "Explore hundreds of genuine perfume listings from sellers across Bangladesh. Find full bottles, partials, and decants at community-driven prices.",
  alternates: { canonical: "https://cloudperfumebd.com/perfumes" },
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PerfumesPage />
    </Suspense>
  );
}
