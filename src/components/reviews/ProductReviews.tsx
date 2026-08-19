import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listReviews, submitReview } from "@/lib/reviews.functions";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-accent" aria-label={`${value} out of 5 stars`}>
      {"★★★★★".slice(0, value)}
      <span className="text-muted-foreground/40">{"★★★★★".slice(value)}</span>
    </span>
  );
}

export function ProductReviews({ slug, productName }: { slug: string; productName: string }) {
  const qc = useQueryClient();
  const load = useServerFn(listReviews);
  const send = useServerFn(submitReview);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const reviews = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () => load({ data: { slug } }),
  });

  const mutation = useMutation({
    mutationFn: () => send({ data: { product_slug: slug, name, rating, comment } }),
    onSuccess: () => {
      toast.success("Thank you! Your review will appear once approved.");
      setName("");
      setComment("");
      setRating(5);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["reviews", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = reviews.data ?? [];
  const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  return (
    <section className="mt-8 rounded-2xl border border-gold/25 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Customer reviews</h3>
          {list.length ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <Stars value={Math.round(average)} /> {average.toFixed(1)} · {list.length} review
              {list.length > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Be the first to review {productName}.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-gold/40 px-4 py-1.5 text-sm transition-colors hover:bg-accent/15"
        >
          {open ? "Cancel" : "Write a review"}
        </button>
      </div>

      {open ? (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <input
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
          />
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            aria-label="Rating"
            className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} star{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <textarea
            required
            minLength={5}
            maxLength={1000}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`How was ${productName}?`}
            className="rounded-xl border border-gold/30 bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="justify-self-start rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? "Submitting…" : "Submit review"}
          </button>
        </form>
      ) : null}

      {list.length ? (
        <ul className="mt-5 space-y-4">
          {list.map((r) => (
            <li key={r.id} className="rounded-xl bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <Stars value={r.rating} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
