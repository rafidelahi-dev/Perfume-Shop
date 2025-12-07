// app/dashboard/layout.tsx (SERVER COMPONENT)
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Header from "@/components/Header";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
<<<<<<< Updated upstream
  const supabase = createServerSupabase();
=======
  // Use the Server Supabase client to safely read the session cookies
  const supabase = await createServerSupabase();
>>>>>>> Stashed changes

  // ✅ Use getUser so Supabase validates the token instead of trusting cookies directly
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/dashboard");
  }

  const email = user.email ?? null;

  return (
    <>
      <Header />
      <div className="flex">
        <DashboardSidebar email={email} />
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </>
  );
}
