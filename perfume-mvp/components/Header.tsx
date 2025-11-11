// components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";

export default function Header() {
  const pathname = usePathname();
  const next = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);
  const router = useRouter();

  const { loading, isAuthenticated, displayName, avatarUrl } = useAuthProfile(); // ⬅️ get avatarUrl
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.refresh();
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

  // Small component for a professional “user chip”
  function UserChip() {
    // fallback image (local) if avatar missing
    const fallback = "/avatar-fallback.png"; // add any simple silhouette to /public
    return (
      <Link
        href="/dashboard/profile"
        className="ml-2 flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm hover:bg-gray-100"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-200">
          <Image
            src={avatarUrl || fallback}
            alt={displayName || "User avatar"}
            fill
            sizes="28px"
            className="object-cover"
          />
        </div>
        <span className="font-medium max-w-[160px] truncate">
          {loading ? "…" : displayName || "User"}
        </span>
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f8f7f3]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div>
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

          {isAuthenticated ? (
            <>
              <NavLink href="/dashboard" label="Dashboard" />
              <UserChip /> {/* ⬅️ avatar + name */}
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

            {isAuthenticated ? (
              <>
                {/* A tiny avatar beside “Profile” link for mobile */}
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <div className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-200">
                    <Image
                      src={avatarUrl || "/avatar-fallback.png"}
                      alt={displayName || "User avatar"}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <span className="font-medium">
                    {loading ? "…" : displayName || "Profile"}
                  </span>
                </Link>

                <NavLink href="/dashboard" label="Dashboard" />

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
