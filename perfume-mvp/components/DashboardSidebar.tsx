// components/DashboardSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";
import { useTransition, useState, useEffect } from "react";

export function DashboardSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('dashboard-sidebar');
      if (isMobileOpen && sidebar && !sidebar.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

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

  const logout = async () => {
    await withTimeout(supabase.auth.signOut({ scope: "local" }), 4000, undefined);
    startTransition(() => router.replace("/login"));
  };

  return (
    <>
      {/* Mobile top bar — own hamburger, no marketing navbar involved */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b flex items-center px-4 gap-3">
        <button
          onClick={() => setIsMobileOpen((o) => !o)}
          className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          aria-label="Toggle dashboard menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <span className="font-semibold text-gray-900">Dashboard</span>
      </div>

      {/* Backdrop while mobile sidebar is open */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar - Highest z-index when open */}
      <aside
        id="dashboard-sidebar"
        className={`
          fixed
          top-0
          left-0
          h-full
          pt-[70px] lg:pt-6
          w-64
          bg-white
          border-r
          p-4
          flex flex-col justify-between
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 z-50' : '-translate-x-full lg:translate-x-0 lg:z-40'}
        `}
      >
        <div className="mt-0">
          <h1 className="text-lg font-bold mb-4">PerfumeMVP</h1>
          <nav className="space-y-1">
            <NavLink href="/dashboard" label="Overview" />
            <NavLink href="/dashboard/perfumes" label="My Perfumes" />
            <NavLink href="/dashboard/listings" label="My Listings" />
            <NavLink href="/dashboard/alerts" label="Alerts" />
            <NavLink href="/dashboard/reviews" label="My Reviews" />
            <NavLink href="/dashboard/blog" label="My Articles" />
            <NavLink href="/dashboard/profile" label="Profile" />
          </nav>
        </div>

        <div className="border-t pt-3 text-sm text-gray-600">
          {email && <p className="truncate">{email}</p>}
          <button
            onClick={logout}
            disabled={isPending}
            className="mt-2 text-red-600 hover:underline disabled:opacity-60"
          >
            {isPending ? "Logging out…" : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}