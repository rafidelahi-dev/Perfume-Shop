"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyPerfumes } from "@/lib/queries/userPerfumes";
import { fetchMyListings } from "@/lib/queries/listings";
import { useRouter } from "next/navigation";
import { qk } from "@/lib/queries/key";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardOverview() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
      const fetchUser = async () => {
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id || null);
      };
      fetchUser();
  
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user?.id || null);
      });
  
      return () => listener.subscription.unsubscribe();
    }, []);
  const router = useRouter();
  const perfumesQuery = useQuery({
    queryKey: qk.dashboardPerfumeStats(userId),
    queryFn: fetchMyPerfumes,
  });

  const listingsQuery = useQuery({
    queryKey: qk.dashboardListingStats(userId),
    queryFn: fetchMyListings,
  });

  const perfumesCount = perfumesQuery.data?.length ?? 0;
  const listingsCount = listingsQuery.data?.length ?? 0;

  const isLoading = perfumesQuery.isLoading || listingsQuery.isLoading;
  const hasError = perfumesQuery.error || listingsQuery.error;

  const handleAddPerfume = () => {
    router.push("/dashboard/perfumes");
  }

  const handleNewListing = () => {
    router.push("/dashboard/listings");
  }

  // Skeleton loader data
  const stats = [
    {
      title: "Total Perfumes",
      value: perfumesCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      description: "In your collection",
      color: "bg-gradient-to-br from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      iconBg: "bg-blue-500"
    },
    {
      title: "Active Listings",
      value: listingsCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      description: "Currently for sale",
      color: "bg-gradient-to-br from-green-50 to-green-100",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      iconBg: "bg-green-500"
    },
    {
      title: "Collection Value",
      value: "–",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      description: "Estimated total worth",
      color: "bg-gradient-to-br from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      iconBg: "bg-purple-500"
    }
  ];

  if (hasError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pt-12">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Your collection and sales at a glance</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 text-red-800">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-sm font-bold">!</span>
            </div>
            <p className="font-medium">Failed to load dashboard data</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or check your connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Your collection and sales at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`relative rounded-xl border ${stat.borderColor} ${stat.color} p-6 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden`}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10 transform translate-x-8 -translate-y-8">
              {stat.icon}
            </div>
            
            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-lg ${stat.iconBg} text-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${stat.textColor} uppercase tracking-wide`}>
                    {stat.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>

              {/* Value */}
              <div className="space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className={`w-2 h-2 rounded-full ${stat.iconBg}`}></div>
                      <span>Last updated just now</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Hover effect border */}
            <div className={`absolute inset-0 rounded-xl border-2 ${stat.borderColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/30 rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={handleAddPerfume}
            className="flex items-center gap-3 p-4 bg-white border border-gray-300 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all duration-300 group">
            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-500 transition-colors duration-300">
              <svg className="w-5 h-5 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-300">Add Perfume</span>
          </button>

          <button onClick={handleNewListing} className="flex items-center gap-3 p-4 bg-white border border-gray-300 rounded-lg hover:border-green-500 hover:shadow-md transition-all duration-300 group">
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors duration-300">
              <svg className="w-5 h-5 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-green-600 transition-colors duration-300">New Listing</span>
          </button>

          <button className="flex items-center gap-3 p-4 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-300 group">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors duration-300">
              <svg className="w-5 h-5 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-300">View Sales</span>
          </button>

          <button className="flex items-center gap-3 p-4 bg-white border border-gray-300 rounded-lg hover:border-purple-500 hover:shadow-md transition-all duration-300 group">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors duration-300">
              <svg className="w-5 h-5 text-purple-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-purple-600 transition-colors duration-300">Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
}