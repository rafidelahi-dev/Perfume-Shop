"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import {
  fetchMyReviews,
  insertReview,
  deleteReview,
  type ReviewInsert,
} from "@/lib/queries/reviews";
import { uploadToBucket } from "@/lib/queries/storage";
import { toast } from "sonner";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import ReviewForm from "./reviewComponents/ReviewForm";
import ReviewList from "./reviewComponents/ReviewList";

const EMPTY_FORM: ReviewInsert = {
  perfume_id: null,
  perfume_name: "",
  brand: "",
  category: "",
  sub_category: null,
  images: [],
  review_text: null,
  rating: null,
  when_to_wear: [],
  gender: null,
  longevity: null,
};

export default function MyReviewsPage() {
  const qc = useQueryClient();
  const userId = useSessionUserId();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReviewInsert>(EMPTY_FORM);
  const [upLoading, setUpLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.userReviews(userId),
    queryFn: fetchMyReviews,
    enabled: !!userId,
  });

  const create = useMutation({
    mutationFn: (input: ReviewInsert) => insertReview(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userReviews(userId) });
      qc.invalidateQueries({ queryKey: qk.dashboardReviewStats(userId) });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Review saved!");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save review"),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userReviews(userId) });
      qc.invalidateQueries({ queryKey: qk.dashboardReviewStats(userId) });
      toast.success("Review deleted.");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const input = e.currentTarget;
    if (!files.length) return;
    setUpLoading(true);
    try {
      const urls = await uploadToBucket("reviews", files);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success("Images uploaded!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : null;
      toast.error(error?.message || "Image upload failed");
    } finally {
      setUpLoading(false);
      if (input) input.value = "";
    }
  }

  function validate(): string | null {
    if (!form.images.length) return "Please upload at least one image.";
    if (!form.perfume_name.trim()) return "Perfume name is required.";
    if (!form.category) return "Category is required.";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = validate();
    if (err) return setFormError(err);
    setSaving(true);
    create.mutate(form, { onSettled: () => setSaving(false) });
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-2 mt-4 md:mt-12">My Reviews</h2>
      <p className="text-gray-600 text-sm mb-4">
        Log your personal impressions of fragrances — rating, longevity, seasonality, and more.
      </p>

      <div className="mb-6">
        <button
          onClick={() => {
            setShowForm((prev) => !prev);
            setFormError(null);
          }}
          className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-[#f8f7f3] hover:opacity-90 text-sm"
        >
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>

      {showForm && (
        <ReviewForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onUpload={onUpload}
          saving={saving}
          upLoading={upLoading}
          error={formError}
        />
      )}

      <h3 className="mb-3 text-lg font-semibold">Your Reviews</h3>
      <ReviewList
        items={data ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        onDelete={(id) => destroy.mutate(id)}
      />
    </section>
  );
}
