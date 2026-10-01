// app/(auth)/reset/confirm/page.tsx
import { Suspense } from "react";
import ResetConfirmClient from "./ResetConfirmClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm Password Reset",
  robots: { index: false, follow: false },
};

export default function ResetConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-sm mx-auto rounded-xl border bg-white p-6">
          <p className="text-sm text-gray-500">Verifying reset link…</p>
        </div>
      }
    >
      <ResetConfirmClient />
    </Suspense>
  );
}
