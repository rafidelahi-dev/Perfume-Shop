"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
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

  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Perfume Share</h1>
      <nav className="space-x-2">
        {link("/", "Home")}
        {link("/perfumes", "Perfumes")}
        {link("/new", "New Listing")}
      </nav>
    </header>
  );
}
