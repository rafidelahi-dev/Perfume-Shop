// components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";

export default function Header() {
  const pathname = usePathname();
  const next = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);
  const router = useRouter();

  const { loading, isAuthenticated, displayName, avatarUrl } = useAuthProfile();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const safeAvatar =
    avatarUrl && avatarUrl !== "null" && avatarUrl.trim() !== ""
      ? avatarUrl
      : "/noimageuser.jpg";

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
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[#1a1a1a] text-[#f8f7f3]"
            : "text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5"
        } ${className}`}
      >
        {label}
      </Link>
    );
  };

  function UserChip() {
    return (
      <Link
        href="/dashboard/profile"
        className="ml-2 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-1.5 py-1.5 pr-4 text-sm hover:shadow-md transition-all"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white">
          <Image
            src={safeAvatar}
            alt={displayName || "User avatar"}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>
        <span className="font-medium text-gray-700 max-w-[100px] truncate hidden xl:block">
          {loading ? "..." : displayName?.split(" ")[0] || "User"}
        </span>
      </Link>
    );
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled 
            ? "h-16 bg-white/80 backdrop-blur-md border-gray-200 shadow-sm" 
            : "h-20 bg-transparent border-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Cloud PerfumeBD Logo"
                width={50}
                height={50}
                className="object-contain"
                style={{ height: "auto", width: "auto" }}
                priority
              />
            </div>
            <span className={`font-serif font-bold text-xl tracking-tight transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
              Cloud<span className="text-[#d4af37]">Perfume</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="Home" />
            <NavLink href="/perfumes" label="Perfumes" />

            <div className="h-6 w-px bg-gray-300 mx-2" /> 

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NavLink href="/dashboard" label="Dashboard" />
                <UserChip />
                <button
                  onClick={logout}
                  className="ml-2 rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link href={`/login?next=${next}`} className="text-sm font-medium hover:text-[#d4af37] transition-colors">
                  Log in
                </Link>
                <Link
                  href={`/signup?next=${next}`}
                  className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="sr-only">Menu</span>
            {open ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden animate-in slide-in-from-top-10 fade-in duration-200">
           <div className="flex flex-col space-y-4">
            <NavLink href="/" label="Home" />
            <NavLink href="/perfumes" label="Perfumes" />
            <hr className="border-gray-100" />
            
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 shadow-sm"
                  onClick={() => setOpen(false)}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                    <Image
                      src={safeAvatar}
                      alt={displayName || "User avatar"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{loading ? "..." : displayName}</span>
                    <span className="text-xs text-gray-500">View Profile</span>
                  </div>
                </Link>

                <NavLink href="/dashboard" label="Dashboard" />
                
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                 <Link
                  href={`/login?next=${next}`}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href={`/signup?next=${next}`}
                  className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-center text-sm font-medium text-white"
                  onClick={() => setOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            )}
           </div>
        </div>
      )}
    </>
  );
}