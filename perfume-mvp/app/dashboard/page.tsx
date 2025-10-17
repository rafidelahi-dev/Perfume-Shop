import { supabase } from "@/lib/supabaseClient";

export default async function DashboardPage() {
  // You can later fetch stats here (total perfumes, listings, favorites)
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm text-gray-500">Total Perfumes</h3>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm text-gray-500">Active Listings</h3>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm text-gray-500">Favorites</h3>
          <p className="text-2xl font-bold">--</p>
        </div>
      </div>
    </section>
  );
}
