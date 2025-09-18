import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Welcome 👋</h2>
        <p className="mt-2 text-gray-700">
          This is your Perfume Share MVP. Use the navigation to browse perfumes or create a listing.
        </p>
      </section>
    </>
  );
}
