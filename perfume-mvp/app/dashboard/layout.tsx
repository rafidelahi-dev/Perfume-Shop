// app/dashboard/layout.tsx (SERVER COMPONENT)
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Header from "@/components/Header";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  const email = session.user?.email ?? null;

  return (
    <>
      <Header /> {/* Ensure Header has proper z-index */}
      <div className="flex">
        <DashboardSidebar email={email} />
        {/* Added pt-16 for mobile to account for header height + menu button */}
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </>
  );
}