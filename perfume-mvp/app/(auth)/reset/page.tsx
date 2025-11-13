// app/(auth)/reset/page.tsx
import { Suspense } from "react";
import ResetClient from "./ResetClient";

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <p className="text-gray-500">Loading reset form…</p>
        </div>
      }
    >
      <ResetClient />
    </Suspense>
  );
}
