// app/(auth)/reset/update/page.tsx
import { Suspense } from "react";
import ResetUpdateClient from "./RequestUpdateClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Update Password",
  robots: { index: false, follow: false },
};

export default function ResetUpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
          <p className="text-sm text-gray-500">Checking reset link…</p>
        </div>
      }
    >
      <ResetUpdateClient />
    </Suspense>
  );
}
