"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

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

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        pathname === href
          ? "bg-gray-900 text-white"
          : "text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </Link>
  );

  async function logout() {
    await supabase.auth.signOut();
    setEmail(null);
    setUserName(null);
  }

  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Perfume Share</h1>

      <nav className="space-x-2">
        {link("/", "Home")}
        {link("/perfumes", "Perfumes")}
        {link("/new", "New Listing")}

        {email ? (
          <>
            {/* 👇 Show Dashboard when user is logged in */}
            {link("/dashboard", "Dashboard")}

            <span className="text-sm text-gray-600">
              Hi, {userName || "User"}
            </span>

            <button
              onClick={logout}
              className="px-3 py-2 rounded-md border text-gray-700 hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {link("/(auth)/login", "Login")}
            {link("/(auth)/signup", "Sign up")}
          </>
        )}
      </nav>
    </header>
  );
}
