// app/(auth)/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <p className="text-gray-500">Loading sign-up…</p>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
