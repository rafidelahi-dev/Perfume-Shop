"use client";

import { useState} from "react";
import ListingForm from "./listingComponents/ListingForm";
import { ListingGrid } from "./listingComponents/ListingGrid";


export default function MyListingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");


  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">My Listings</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a1a1a] text-[#f8f7f3] px-6 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium"
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
