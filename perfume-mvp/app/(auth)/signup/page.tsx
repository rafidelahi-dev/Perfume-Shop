// app/(auth)/signup/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import JoinClient from "../join/JoinClient";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const { next: rawNext } = await searchParams;
  // A bare "/" (navbar link clicked on the homepage) is not a destination.
  const nextPath =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    rawNext !== "/"
      ? rawNext
      : "/dashboard";

  return (
    <Suspense fallback={<div className="flex justify-center py-10">Loading…</div>}>
      <JoinClient
        nextPath={nextPath}
        title="Create your account"
        subtitle="Google or a phone code. No password needed."
      />
    </Suspense>
  );
}
