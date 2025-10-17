"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) router.push("/login");
      setEmail(user?.email ?? null);
    });
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        pathname === href
          ? "bg-gray-900 text-white"
          : "text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-lg font-bold mb-4">PerfumeMVP</h1>
          <nav className="space-y-1">
            <NavLink href="/dashboard" label="Overview" />
            <NavLink href="/dashboard/perfumes" label="My Perfumes" />
            <NavLink href="/dashboard/listings" label="My Listings" />
            <NavLink href="/dashboard/favorites" label="Favorites" />
            <NavLink href="/dashboard/profile" label="Profile" />
          </nav>
        </div>
        <div className="border-t pt-3 text-sm text-gray-600">
          {email && <p className="truncate">{email}</p>}
          <button onClick={logout} className="mt-2 text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
