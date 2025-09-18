import Header from "@/components/Header";
import NewListingForm from "@/components/NewListingForm";

export default function NewListingPage() {
  return (
    <>
      <Header />
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Create a Listing</h2>
        <NewListingForm />
      </div>
    </>
  );
}
