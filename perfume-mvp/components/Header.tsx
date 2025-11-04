// components/Header.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import Image from "next/image";

export default function Header() {
  const pathname = usePathname();
  const next = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);

  // Centralized auth/profile state
  const { loading, email, displayName } = useAuthProfile();

  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    // optional: you can route to home here if you like:
    // router.push("/");
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
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
          isActive
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
        {/* Logo with Image */}
        <Link href="/" className="flex items-center gap-3">
          <div > {/* Larger container */}
            <Image
              src="/logo.png"
              alt="Perfume Share Logo"
              width={68}
              height={68}
              className="object-contain"
              priority
            />
          </div>
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
                <span className="font-medium">
                  {loading ? "…" : displayName || "User"}
                </span>
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
              <NavLink href={`/login?next=${next}`} label="Login" />
              <Link
                href={`/signup?next=${next}`}
                className="ml-2 rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen((o) => !o)}
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
                <NavLink href={`/login?next=${next}`} label="Login" />
                <NavLink href={`/signup?next=${next}`} label="Sign up" />
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}