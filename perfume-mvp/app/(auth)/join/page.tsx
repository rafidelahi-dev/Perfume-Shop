import { Suspense } from "react";
import type { Metadata } from "next";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
  title: "Join Cloud PerfumeBD",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function JoinPage({ searchParams }: PageProps) {
  const { next: rawNext } = await searchParams;
  const nextPath =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    rawNext !== "/"
      ? rawNext
      : "/fragrances";

  return (
    <Suspense fallback={<div className="flex justify-center py-10">Loading…</div>}>
      <JoinClient nextPath={nextPath} />
    </Suspense>
  );
}
