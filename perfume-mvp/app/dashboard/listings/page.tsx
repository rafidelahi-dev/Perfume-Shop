"use client";

import { useState} from "react";
import ListingForm from "./listingComponents/ListingForm";
import { ListingGrid } from "./listingComponents/ListingGrid";


export default function MyListingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");


  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-sm">
        <h2 className="text-lg sm:text-2xl font-semibold">My Listings</h2>
        <p className="mt-1 text-[11px] sm:text-xs text-gray-600">
          You can list all the perfumes that you are selling here. These will be
          displayed in the "Perfumes" section for all users to see and contact you.
        </p>
      </div>

      {/* Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="self-start sm:self-auto bg-[#1a1a1a] text-[#f8f7f3] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:opacity-90 transition-opacity font-medium text-xs sm:text-sm"
      >
        {showForm ? "Cancel" : "+ Add New Listing"}
      </button>
    </div>


      <div className="mb-4">
      <input type="text" placeholder="Search from your list..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:w-1/2 rounded-xl border border-black/10 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"></input>
      </div>

      {/* Form */}
      {showForm && <ListingForm/>}

      {/* Listings grid */}
      <ListingGrid/>
    </section>
  );
}
