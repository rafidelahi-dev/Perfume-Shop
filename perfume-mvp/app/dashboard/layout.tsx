// app/dashboard/layout.tsx (Modified)
import type { Metadata } from "next";
import { ReactNode } from "react";
import { createServerSupabase } from "@/lib/supabaseServer"; // Still needed for safe cookie read
import { DashboardSidebar } from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import Header from "@/components/Header";



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

  // Fetch profile for Header pre-population (avoids client-side flash)
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let isPending = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url, status")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name || profile?.username || "User";
    avatarUrl = profile?.avatar_url ?? null;
    isPending = profile?.status === 'pending';
  }



  return (

    <>

      <Header
        hideLogout
        initialAuth={{
          isAuthenticated: !!user,
          displayName,
          avatarUrl,
        }}
      />

      <div className="flex">
        {/* Pass the email/user data safely */}
        <DashboardSidebar email={email} /> 
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] p-4 lg:p-6 pt-16 lg:pt-6">

          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800 flex items-start gap-2">
              <span className="font-semibold shrink-0">Your account is pending approval.</span>
              <span>You&apos;ll be able to create listings once an admin reviews your profile. Make sure your phone number and a WhatsApp or Facebook contact are filled in.</span>
            </div>
          )}

          {children}

        </main>

      </div>

    </>

  );
}