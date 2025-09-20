"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import NewListingForm from "@/components/NewListingForm";
import { supabase } from "@/lib/supabaseClient";

export default function NewListingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const ok = !!data.session;
      setAuthed(ok);
      setReady(true);
      if (!ok) router.push("/login");
    });
  }, [router]);

  if (!ready) return <div className="p-6">Checking auth…</div>;

  return (
    <>
      <Header />
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Create a Listing</h2>
        {authed ? <NewListingForm /> : null}
      </div>
    </>
  );
}
