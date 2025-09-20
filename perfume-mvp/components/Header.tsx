"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const [email,setEmail] = useState<string|null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        pathname === href ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </Link>
  );

  async function logout() { await supabase.auth.signOut(); }


  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Perfume Share</h1>
      <nav className="space-x-2">
        {link("/", "Home")}
        {link("/perfumes", "Perfumes")}
        {link("/new", "New Listing")}
        {email ? (
          <>
            <span className="text-sm text-gray-600">Hi, {email}</span>
            <button onClick={logout} className="px-3 py-2 rounded-md border">Logout</button>
          </>
        ) : (
          <>
            {link("/login", "Login")}
            {link("/signup", "Sign up")}
          </>
        )}
      </nav>
    </header>
  );
}
