// app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

type PageProps = {
  searchParams?: { next?: string };
};

export default function LoginPage({ searchParams }: PageProps) {
  const rawNext = searchParams?.next;

  // Ensure a safe path (must start with "/")
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/")
      ? rawNext
      : "/dashboard";

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <p className="text-gray-500">Loading login…</p>
        </div>
      }
    >
      <LoginClient nextPath={nextPath} />
    </Suspense>
  );
}
