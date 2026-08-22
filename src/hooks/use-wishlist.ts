import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { listWishlist, toggleWishlist } from "@/lib/wishlist.functions";

/** Per-customer wishlist, backed by the database and scoped by RLS. */
export function useWishlist() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listWishlist);
  const toggle = useServerFn(toggleWishlist);

  const query = useQuery({
    queryKey: ["wishlist"],
    enabled: Boolean(session),
    queryFn: () => list({ data: undefined }),
  });

  const mutation = useMutation({
    mutationFn: (slug: string) => toggle({ data: { slug } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const slugs = query.data ?? [];
  return {
    slugs,
    signedIn: Boolean(session),
    has: (slug: string) => slugs.includes(slug),
    toggle: (slug: string) => mutation.mutateAsync(slug),
    loading: query.isLoading,
  };
}
