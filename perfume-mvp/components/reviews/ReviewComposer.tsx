"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { uploadToBucket } from "@/lib/queries/storage";
import { updateReviewDetails, type ReviewDetails } from "@/lib/queries/reviews";

type Props = {
  reviewId: string;
  initial: ReviewDetails;
  onSaved: () => void;
  onCancel: () => void;
};

const MAX_IMAGES = 4;
const MAX_TEXT = 2000;

export default function ReviewComposer({ reviewId, initial, onSaved, onCancel }: Props) {
  const [text, setText] = useState(initial.review_text ?? "");
  const [images, setImages] = useState<string[]>(initial.images);
  const [owns, setOwns] = useState(initial.owns_bottle);
  const [knows, setKnows] = useState(initial.knows_seller);
  const [anon, setAnon] = useState(initial.is_anonymous);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).slice(0, MAX_IMAGES - images.length);
    setBusy(true);
    try {
      const urls = await uploadToBucket("reviews", picked);
      setImages((prev) => [...prev, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setBusy(true);
    try {
      await updateReviewDetails(reviewId, {
        review_text: text.trim() || null,
        images,
        owns_bottle: owns,
        knows_seller: knows,
        is_anonymous: anon,
      });
      toast.success("Review saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
        rows={4}
        placeholder="Say more (optional): how does it smell, when do you wear it?"
        className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#d4af37]"
      />

      <div className="flex flex-wrap items-center gap-2">
        {images.map((url) => (
          <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
              className="absolute right-0 top-0 grid h-5 w-5 place-items-center bg-black/60 text-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-50"
            aria-label="Add photo"
          >
            <ImagePlus size={20} />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={owns} onChange={(e) => setOwns(e.target.checked)} />
          I own this
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={knows} onChange={(e) => setKnows(e.target.checked)} />
          I know the seller
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          Post anonymously
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-full bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save review"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
