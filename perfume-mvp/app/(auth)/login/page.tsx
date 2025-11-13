// app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-600 text-sm">Loading login…</p>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
