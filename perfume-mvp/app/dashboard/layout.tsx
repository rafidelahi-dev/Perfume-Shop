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
    <Header/>
    <div className="min-h-screen flex bg-gray-50">
      <DashboardSidebar email={email} />
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
    </>
  );
}
