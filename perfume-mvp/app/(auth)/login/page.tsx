import { Suspense } from "react";
import LoginClient from "./LoginClient";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  // Await the incoming params from Next.js
  const params = await searchParams;

  const rawNext = params?.next;
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/")
      ? rawNext
      : "/dashboard";

  return (
    <Suspense fallback={<div className="flex justify-center py-10">Loading…</div>}>
      <LoginClient nextPath={nextPath} />
    </Suspense>
  );
}
