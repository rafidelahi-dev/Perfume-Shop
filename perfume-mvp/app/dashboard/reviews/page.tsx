"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/key";
import { deleteReview, fetchMyReviews } from "@/lib/queries/reviews";
import { toast } from "sonner";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import ReviewList from "./reviewComponents/ReviewList";

export default function ReviewsPage() {
  const qc = useQueryClient();
  const userId = useSessionUserId();

  const { data, isLoading, error } = useQuery({
    queryKey: qk.userReviews(userId),
    queryFn: fetchMyReviews,
    enabled: !!userId,
  });

  const remove = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userReviews(userId) });
      qc.invalidateQueries({ queryKey: qk.dashboardReviewStats(userId) });
      toast.success("Review deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-2 mt-4 md:mt-12">My Reviews</h2>
      <p className="text-gray-600 text-sm mb-6">
        Your ratings and comments on fragrances. To add or change one, open the{" "}
        <Link href="/fragrances" className="underline">
          fragrance page
        </Link>{" "}
        and tap the stars.
      </p>

      <ReviewList
        items={data ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        onDelete={(id) => {
          if (confirm("Delete this review?")) remove.mutate(id);
        }}
      />
    </section>
  );
}
