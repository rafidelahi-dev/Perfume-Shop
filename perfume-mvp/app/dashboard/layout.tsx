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
    // Optional: remember where to send the user back after login
    redirect("/login?next=/dashboard");
  }

  const email = session.user?.email ?? null;

  return (
    <>
      <Header /> {/* stays fixed */}
      <div className="flex">
        <DashboardSidebar email={email} />
        <main className="flex-1 ml-64 h-[calc(100vh-64px)] p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </>
  );
}
