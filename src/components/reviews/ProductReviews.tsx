import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Camera, ThumbsUp, X } from "lucide-react";
import { listReviews, submitReview, toggleHelpful, type Review } from "@/lib/reviews.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/StarRating";
import type { SizeOption } from "@/data/products";

/** Photos are stored as private storage paths and served through our own route. */
const photoUrl = (p: string) =>
  p.startsWith("http") || p.startsWith("/") ? p : `/api/public/review-photo/${p}`;

function Stars({ value }: { value: number }) {
  return (
    <span className="text-accent" aria-label={`${value} out of 5 stars`}>
      {"★★★★★".slice(0, value)}
      <span className="text-muted-foreground/40">{"★★★★★".slice(value)}</span>
    </span>
  );
}

type SortKey = "helpful" | "newest" | "highest" | "lowest";

export function ProductReviews({
  slug,
  productName,
  sizeOptions = [],
}: {
  slug: string;
  productName: string;
  sizeOptions?: SizeOption[];
}) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const load = useServerFn(listReviews);
  const send = useServerFn(submitReview);
  const vote = useServerFn(toggleHelpful);

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [city, setCity] = useState("");
  const [pack, setPack] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sort, setSort] = useState<SortKey>("helpful");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [shown, setShown] = useState(5);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reviews = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () => load({ data: { slug } }),
  });

  // ?review=1#write-review opens the form; ?rating=4 pre-selects the stars.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") === "1") {
      const star = Number(params.get("rating"));
      if (star >= 1 && star <= 5) setRating(star);
      setOpen(true);
      requestAnimationFrame(() => {
        document.getElementById("write-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const list = reviews.data ?? [];
  const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const breakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of list) counts[r.rating - 1]!++;
    return counts;
  }, [list]);
  const allPhotos = useMemo(() => list.flatMap((r) => r.photos), [list]);

  const visible = useMemo(() => {
    let out = list;
    if (starFilter != null) out = out.filter((r) => r.rating === starFilter);
    if (photosOnly) out = out.filter((r) => r.photos.length > 0);
    const sorted = [...out];
    if (sort === "helpful") sorted.sort((a, b) => b.helpful_count - a.helpful_count);
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "highest") sorted.sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") sorted.sort((a, b) => a.rating - b.rating);
    return sorted;
  }, [list, sort, starFilter, photosOnly]);

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          product_slug: slug,
          rating,
          title,
          comment,
          city: city || undefined,
          size_label: pack || undefined,
          photos,
        },
      }),
    onSuccess: () => {
      toast.success("Thank you! Your review will appear once approved.");
      setTitle("");
      setComment("");
      setCity("");
      setPack("");
      setPhotos([]);
      setRating(0);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["reviews", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    if (!session) {
      toast.info("Sign in to add photos.");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 3 - photos.length)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("review-photos").upload(path, file, { upsert: false });
        if (error) throw error;
        urls.push(path);
      }
      setPhotos((p) => [...p, ...urls].slice(0, 3));
    } catch {
      toast.error("Photo upload failed. Please try a smaller image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onVote(r: Review) {
    if (!session) {
      toast.info("Sign in to mark a review helpful.");
      return;
    }
    try {
      await vote({ data: { review_id: r.id } });
      void qc.invalidateQueries({ queryKey: ["reviews", slug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your vote.");
    }
  }

  const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

  return (
    <section className="mt-8 rounded-2xl border border-gold/25 p-5" aria-label="Customer reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg">Customer reviews</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-gold/40 px-4 py-1.5 text-sm transition-colors hover:bg-accent/15"
        >
          {open ? "Cancel" : "Write a review"}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet – be the first to review {productName}.</p>
      ) : (
        <>
          {/* Summary + star breakdown */}
          <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="text-center sm:text-left">
              <p className="text-4xl font-semibold">{average.toFixed(1)}</p>
              <div className="mt-1">
                <StarRating rating={average} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Based on {list.length} review{list.length > 1 ? "s" : ""}</p>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star - 1] ?? 0;
                const pct = list.length ? Math.round((count / list.length) * 100) : 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarFilter((f) => (f === star ? null : star))}
                    aria-pressed={starFilter === star}
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-accent/10 ${starFilter === star ? "bg-accent/15" : ""}`}
                  >
                    <span className="w-6 shrink-0 text-left">{star}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-muted-foreground">{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer photos strip */}
          {allPhotos.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium">Customer photos</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {allPhotos.slice(0, 12).map((url) => (
                  <button key={url} type="button" onClick={() => setLightbox(url)} className="shrink-0">
                    <img src={url} alt="Customer photo" loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort + filters */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort reviews"
              className="rounded-full border border-gold/40 bg-card px-3 py-1.5 text-sm"
            >
              <option value="helpful">Most helpful</option>
              <option value="newest">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
            <button
              type="button"
              onClick={() => setPhotosOnly((v) => !v)}
              aria-pressed={photosOnly}
              className={`rounded-full border px-3 py-1.5 text-xs ${photosOnly ? "border-primary bg-primary/10" : "border-gold/40"}`}
            >
              With photos
            </button>
            {starFilter != null && (
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs"
              >
                {starFilter}★ only ✕
              </button>
            )}
          </div>

          <ul className="mt-5 space-y-4">
            {visible.slice(0, shown).map((r) => (
              <li key={r.id} className="rounded-xl bg-secondary/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {r.title && <p className="mt-1.5 text-sm font-semibold">{r.title}</p>}
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                {r.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {r.photos.map((url) => (
                      <button key={url} type="button" onClick={() => setLightbox(url)}>
                        <img src={url} alt="Customer photo" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {firstName(r.name)}
                    {r.city ? `, ${r.city}` : ""}
                  </span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
                    </span>
                  )}
                  {r.size_label && <span>Bought: {r.size_label}</span>}
                </div>
                {r.store_reply && (
                  <div className="mt-3 rounded-lg border border-gold/30 bg-background/60 p-3 text-xs">
                    <p className="font-semibold">Reply from Swastik Camphor</p>
                    <p className="mt-1 text-muted-foreground">{r.store_reply}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void onVote(r)}
                  aria-pressed={r.helpful_by_me}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    r.helpful_by_me ? "border-primary bg-primary/10 text-primary" : "border-gold/40 text-muted-foreground hover:border-primary/60"
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Helpful ({r.helpful_count})
                </button>
              </li>
            ))}
          </ul>
          {visible.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + 5)}
              className="mt-4 rounded-full border border-gold/40 px-5 py-2 text-sm transition-colors hover:bg-accent/15"
            >
              Show more reviews
            </button>
          )}
        </>
      )}

      {/* Write a review */}
      {open && (
        <form
          id="write-review"
          className="mt-5 scroll-mt-28 rounded-xl border border-gold/30 bg-secondary/30 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rating) {
              toast.error("Please choose a star rating first.");
              return;
            }
            mutation.mutate();
          }}
        >
          {!session ? (
            <p className="text-sm text-muted-foreground">
              Please{" "}
              <a href="/auth" className="font-medium text-primary underline underline-offset-2">
                sign in
              </a>{" "}
              to write a review.
            </p>
          ) : (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium">Your rating *</p>
                <div className="mt-1 flex gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${i} star${i > 1 ? "s" : ""}`}
                      onMouseEnter={() => setHover(i)}
                      onClick={() => setRating(i)}
                      className={`text-3xl leading-none transition-transform hover:scale-110 ${
                        i <= (hover || rating) ? "text-gold" : "text-muted-foreground/30"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <input
                required
                minLength={2}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Review title"
                className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
              />
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`How was ${productName}?`}
                className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  maxLength={60}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Your city (optional)"
                  className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
                />
                {sizeOptions.length > 0 && (
                  <select
                    value={pack}
                    onChange={(e) => setPack(e.target.value)}
                    aria-label="Which pack did you buy?"
                    className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Which pack did you buy? (optional)</option>
                    {sizeOptions.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void uploadPhotos(e.target.files)}
                />
                <button
                  type="button"
                  disabled={uploading || photos.length >= 3}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm transition-colors hover:bg-accent/15 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  {uploading ? "Uploading…" : `Add photos (${photos.length}/3)`}
                </button>
                {photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {photos.map((url) => (
                      <span key={url} className="relative">
                        <img src={url} alt="Your upload" className="h-16 w-16 rounded-lg object-cover" />
                        <button
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-background shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={mutation.isPending || !rating}
                className="justify-self-start rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-60"
              >
                {mutation.isPending ? "Submitting…" : "Submit review"}
              </button>
              <p className="text-xs text-muted-foreground">Reviews appear after a quick check by our team.</p>
            </div>
          )}
        </form>
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Customer photo enlarged" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </section>
  );
}
