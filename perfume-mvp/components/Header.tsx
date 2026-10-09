// components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Droplets, Tag, Star, PenLine, Settings, BellRing } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import { withTimeout } from "@/lib/queries/auth";

const DASHBOARD_TILES = [
  { href: "/dashboard", label: "Overview", hint: "Your summary", Icon: LayoutDashboard },
  { href: "/dashboard/perfumes", label: "My Perfumes", hint: "Your collection", Icon: Droplets },
  { href: "/dashboard/listings", label: "My Listings", hint: "What you sell", Icon: Tag },
  { href: "/dashboard/alerts", label: "Alerts", hint: "New posts for you", Icon: BellRing },
  { href: "/dashboard/reviews", label: "My Reviews", hint: "Ratings you left", Icon: Star },
  { href: "/dashboard/blog", label: "My Articles", hint: "Your writing", Icon: PenLine },
  { href: "/dashboard/profile", label: "Settings", hint: "Profile & contact", Icon: Settings },
];

// Module scope on purpose: defined inside Header it gets a new identity every
// render, so the hover pill's state updates remounted every link mid-click.
function NavLink({
  href,
  label,
  className = "",
  slide = false,
}: {
  href: string;
  label: React.ReactNode;
  className?: string;
  slide?: boolean;
}) {
  const isActive = usePathname() === href;
  return (
    <Link
      href={href}
      className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "bg-[#1a1a1a] text-[#f8f7f3]"
          : `text-[#1a1a1a]/70 hover:text-[#1a1a1a] ${slide ? "" : "hover:bg-black/5"}`
      } ${className}`}
    >
      {label}
    </Link>
  );
}

export default function Header({
  hideMobileBurger = false,
  hideLogout = false,
  initialAuth,
}: {
  hideMobileBurger?: boolean;
  hideLogout?: boolean;
  initialAuth?: {
    isAuthenticated: boolean;
    displayName: string | null;
    avatarUrl: string | null;
  };
}) {
  const pathname = usePathname();
  const next = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);
  const router = useRouter();

  const { loading, isAuthenticated, isAdmin, displayName, avatarUrl } = useAuthProfile(initialAuth);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Sliding hover pill behind the desktop nav links. `instant` = first hover
  // after the pointer entered from outside: jump into place, don't slide.
  const [pill, setPill] = useState({ left: 0, width: 0, show: false, instant: true });

  function movePillTo(el: HTMLElement | null) {
    if (!el) return;
    setPill((p) =>
      p.show && p.left === el.offsetLeft && p.width === el.offsetWidth
        ? p
        : { left: el.offsetLeft, width: el.offsetWidth, show: true, instant: !p.show }
    );
  }
  function hidePill() {
    setPill((p) => ({ ...p, show: false }));
  }

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const safeAvatar =
    avatarUrl && avatarUrl !== "null" && avatarUrl.trim() !== ""
      ? avatarUrl
      : "/noimageuser.jpg";

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    // scope: "local" skips the server revocation round-trip so this can't
    // hang on a flaky network — see withTimeout's comment in lib/queries/auth.ts
    await withTimeout(supabase.auth.signOut({ scope: "local" }), 4000, undefined);
    router.refresh();
    setLoggingOut(false);
  }

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
          {displayName?.split(" ")[0] || "User"}
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
        <div className="mx-auto flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 sm:gap-2 group">
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
            <div
              className="relative flex items-center gap-1"
              onMouseOver={(e) => movePillTo((e.target as HTMLElement).closest("a"))}
              onFocus={(e) => movePillTo((e.target as HTMLElement).closest("a"))}
              onMouseLeave={hidePill}
              onBlur={hidePill}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-0 top-0 h-full rounded-full bg-black/5 ${
                  pill.instant
                    ? "transition-opacity duration-150"
                    : "transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                } motion-reduce:transition-none ${pill.show ? "opacity-100" : "opacity-0"}`}
                style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
              />
              <NavLink slide href="/" label="Home" />
              <NavLink slide href="/perfumes" label="Sell Post" />
              <NavLink slide href="/fragrances" label="Fragrances" />
              <NavLink slide href="/blog" label="Blog" />
              <NavLink
                slide
                href="/partials"
                label={
                  <>
                    <span className="lg:hidden">Partials</span>
                    <span className="hidden lg:inline">Drop your partials</span>
                  </>
                }
              />
              <NavLink slide href="/wanted" label="Wanted" />
            </div>

            <div className="h-6 w-px bg-gray-300 mx-2" />

            {loading ? (
              <div className="flex items-center gap-3 ml-2 animate-pulse">
                <div className="h-8 w-16 rounded-full bg-gray-200" />
                <div className="h-9 w-24 rounded-full bg-gray-200" />
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <NavLink href="/superadmin" label="Panel" />
                ) : (
                  <>
                    <NavLink href="/dashboard" label="Dashboard" />
                    <UserChip />
                  </>
                )}
                {!hideLogout && (
                  <button
                    onClick={logout}
                    disabled={loggingOut}
                    className="ml-2 rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Logout"
                  >
                    {loggingOut ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    )}
                  </button>
                )}
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
          {!hideMobileBurger && (
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
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {!hideMobileBurger && open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-white pt-24 px-6 pb-10 md:hidden animate-in slide-in-from-top-10 fade-in duration-200">
           <div className="flex flex-col space-y-4">
            <NavLink href="/" label="Home" />
            <NavLink href="/perfumes" label="Sell Post" />
            <NavLink href="/fragrances" label="Fragrances" />
            <NavLink href="/blog" label="Blog" />
            <NavLink href="/partials" label="Drop your partials" />
            <NavLink href="/wanted" label="Wanted" />
            <hr className="border-gray-100" />
            
            {loading ? (
              <div className="flex flex-col gap-3 mt-4 animate-pulse">
                <div className="h-14 rounded-xl bg-gray-100" />
                <div className="h-10 rounded-lg bg-gray-100" />
              </div>
            ) : isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/superadmin"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl bg-[#1a1a1a] px-4 py-3 text-center text-sm font-medium text-white"
                  >
                    Panel
                  </Link>
                ) : (
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
                    <span className="font-semibold text-gray-900">{displayName}</span>
                    <span className="text-xs text-gray-500">View Profile</span>
                  </div>
                </Link>

                {/* Dashboard shortcuts: 2-column tiles, big thumb targets */}
                <nav aria-label="Dashboard" className="space-y-3">
                  <p className="px-1 text-sm font-semibold text-gray-900">Your dashboard</p>
                  <div className="grid grid-cols-2 gap-3">
                    {DASHBOARD_TILES.map(({ href, label, hint, Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-[88px] flex-col justify-between rounded-2xl border p-3.5 [&:last-child:nth-child(odd)]:col-span-2 transition active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] ${
                            active
                              ? "border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-md"
                              : "border-black/10 bg-[#fdfbf7] text-[#1a1a1a] hover:border-[#d4af37]/60"
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 place-items-center rounded-xl ${
                              active ? "bg-white/15 text-[#d4af37]" : "bg-[#d4af37]/15 text-[#8a6d00]"
                            }`}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold leading-tight">{label}</span>
                            <span className={`block text-xs ${active ? "text-white/70" : "text-[#666]"}`}>
                              {hint}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
                </>
                )}

                {!hideLogout && (
                  <button
                    onClick={() => { logout(); setOpen(false); }}
                    disabled={loggingOut}
                    className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600 disabled:opacity-50"
                  >
                    {loggingOut ? "Signing out…" : "Sign Out"}
                  </button>
                )}
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