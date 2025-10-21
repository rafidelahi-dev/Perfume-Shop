"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch user session & profile
  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setEmail(null);
        setUserName(null);
        return;
      }

      // Get username/display name from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

      setEmail(user.email ?? null);
      setUserName(profile?.display_name || profile?.username || "User");
    }

    fetchUserProfile();

    // Re-fetch when auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchUserProfile();
      else {
        setEmail(null);
        setUserName(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setEmail(null);
    setUserName(null);
  }

  const NavLink = ({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) => {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive
        ? "bg-[#1a1a1a] text-[#f8f7f3]"
        : "text-[#1a1a1a]/80 hover:text-[#1a1a1a] hover:bg-[#eae8e1]"
      } ${className}`}
    >
      {label}
    </Link>
  );
};

  return (
    <header className="sticky top-0 z-50 mb-6 border-b border-black/5 bg-[#f8f7f3]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500" />
          <span className="text-lg font-semibold tracking-tight">Perfume Share</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" label="Home" />
          <NavLink href="/perfumes" label="Perfumes" />

          {email ? (
            <>
              <NavLink href="/dashboard" label="Dashboard" />
              <Link
                href="/dashboard/profile"
                className="ml-2 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                <span className="font-medium">{userName}</span>
              </Link>
              <button
                onClick={logout}
                className="ml-2 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login" label="Login" />
              <Link
                href="/signup"
                className="ml-2 rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-t bg-white/90 backdrop-blur-md md:hidden">
          <nav className="flex flex-col space-y-2 px-4 py-3">
            <NavLink href="/" label="Home" />
            <NavLink href="/perfumes" label="Perfumes" />
            <NavLink href="/new" label="New Listing" />
            {email ? (
              <>
                <NavLink href="/dashboard" label="Dashboard" />
                <NavLink href="/dashboard/profile" label="Profile" />
                <button
                  onClick={logout}
                  className="rounded-md border px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink href="/login" label="Login" />
                <NavLink href="/signup" label="Sign up" />
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
