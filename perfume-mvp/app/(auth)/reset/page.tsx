// app/(auth)/reset/page.tsx
import { Suspense } from "react";
import ResetRequestClient from "./ResetRequestClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <p className="text-gray-500">Loading reset form…</p>
        </div>
      }
    >
      <ResetRequestClient />
    </Suspense>
  );
}
