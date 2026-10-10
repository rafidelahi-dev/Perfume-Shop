// app/dashboard/layout.tsx (Modified)
import type { Metadata } from "next";
import { ReactNode } from "react";
import { createServerSupabase } from "@/lib/supabaseServer"; // Still needed for safe cookie read
import { DashboardSidebar } from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};



export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Use the Server Supabase client to safely read the session cookies
  const supabase = await createServerSupabase();

  // The middleware already ensures a user exists, so we don't need to redirect.
  // We just need the user object for the layout (e.g., sidebar info).
  const { data: { user } } = await supabase.auth.getUser();

  // The user should always exist here because the middleware redirects if not.
  // If the user somehow doesn't exist, we can show a minimal fallback, 
  // but the redirect logic is now exclusively in middleware.ts.
  
  // NOTE: You can remove the 'if (error || !user) { redirect("/login...") }' block entirely.

  const email = user?.email ?? null; // Use optional chaining just in case

  return (

    <>

      <div className="flex">
        {/* Pass the email/user data safely */}
        <DashboardSidebar email={email} />
        <main className="flex-1 lg:ml-64 min-h-screen p-4 lg:p-6 pt-20 lg:pt-6">

          {children}

        </main>

      </div>

    </>

  );
}