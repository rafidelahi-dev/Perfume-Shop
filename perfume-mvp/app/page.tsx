// app/page.tsx
import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative w-full overflow-hidden rounded-none bg-gradient-to-br from-[#f8f7f3] to-[#f3f1ec] py-24 px-6 sm:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[#111] sm:text-6xl">
            Find your <span className="text-[#d4af37]">signature scent</span>.
          </h1>
          <p className="mt-4 text-lg text-[#444] max-w-2xl mx-auto">
            Discover, decant and share rare fragrances from the world’s finest perfume collectors.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/perfumes" className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-[#f8f7f3] hover:opacity-90">
              Explore perfumes
            </Link>
            <Link href="/dashboard/listings" className="rounded-full border border-[#1a1a1a] px-6 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#eae8e1]">
              Sell your decant
            </Link>
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Shop by vibe</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Citrus Fresh", color: "from-yellow-100 to-amber-100" },
            { label: "Sweet & Gourmand", color: "from-pink-100 to-rose-100" },
            { label: "Woody & Warm", color: "from-orange-100 to-amber-100" },
            { label: "Aquatic & Clean", color: "from-sky-100 to-cyan-100" },
          ].map((c) => (
            <Link
              key={c.label}
              href={`/perfumes?tag=${encodeURIComponent(c.label)}`}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${c.color} p-5 transition hover:shadow-lg`}
            >
              <span className="text-sm font-medium">{c.label}</span>
              <span className="absolute right-3 top-3 text-xs text-foreground/60">Shop →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending grid */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Trending now</h2>
          <Link href="/perfumes" className="text-sm text-foreground/70 hover:text-foreground">
            View all
          </Link>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Dior Sauvage", price: 32, tag: "10ml decant" },
            { title: "Creed Aventus", price: 58, tag: "10ml decant" },
            { title: "Bleu de Chanel", price: 36, tag: "5ml decant" },
          ].map((p) => (
            <li key={p.title} className="group overflow-hidden rounded-2xl border bg-white/70 p-4 transition hover:shadow-xl">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200" />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{p.title}</h3>
                  <p className="text-xs text-foreground/60">{p.tag}</p>
                </div>
                <span className="rounded-full bg-black px-3 py-1 text-sm text-white">${p.price}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5">Details</button>
                <Link href="/dashboard/favorites" className="rounded-lg bg-black px-3 py-2 text-sm text-white">
                  ♥ Favorite
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
