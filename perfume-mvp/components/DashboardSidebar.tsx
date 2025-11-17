// components/DashboardSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
    await supabase.auth.signOut();
    startTransition(() => router.replace("/login"));
  };

  return (
    <>
      {/* Mobile Menu Button - Increased z-index to appear above header */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay - Behind sidebar but above everything else */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" />
      )}

      {/* Sidebar - Highest z-index when open */}
      <aside
        id="dashboard-sidebar"
        className={`
          fixed
          top-0
          left-0
          h-full
          w-64
          bg-white
          border-r
          p-4
          flex flex-col justify-between
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 z-50' : '-translate-x-full lg:translate-x-0 lg:z-40'}
        `}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mt-12 lg:mt-0">
          <h1 className="text-lg font-bold mb-4">PerfumeMVP</h1>
          <nav className="space-y-1">
            <NavLink href="/dashboard" label="Overview" />
            <NavLink href="/dashboard/perfumes" label="My Perfumes" />
            <NavLink href="/dashboard/listings" label="My Listings" />
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