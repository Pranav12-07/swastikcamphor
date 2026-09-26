import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCatalog } from "@/lib/catalog";
import { useStoreSettings } from "@/lib/store-settings";
import { useAuth } from "@/lib/auth";
import { getMyCart, syncMyCart, validateCoupon, type CouponRule } from "@/lib/cart.functions";
import { defaultSizeOption, isTwinPack, matchingTwin, priceForSize, sizeAvailable } from "@/data/products";
import { migrateCartLine } from "@/lib/pack-redirects";
import { StealDealPopup } from "@/components/StealDealPopup";

/** Carts saved before the catalogue restructure point at old listings; move them to the matching pack. */
function migrateLines(lines: CartLine[]): CartLine[] {
  let changed = false;
  const next = lines.map((l) => {
    const target = migrateCartLine(l.slug, l.size);
    if (!target) return l;
    changed = true;
    return { slug: target.slug, size: target.size, qty: l.qty };
  });
  return changed ? next : lines;
}


export type CartLine = { slug: string; size: string; qty: number };

type CartValue = {
  lines: CartLine[];
  add: (slug: string, size?: string, qty?: number, opts?: { skipUpsell?: boolean }) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
  /** Distinct products in the cart (badge value). */
  count: number;
  /** Total units across all lines. */
  itemCount: number;
  subtotal: number;
  shipping: number;
  discount: number;
  /** Steal Deal (Twin Pack) discount actually applied — the bigger of coupon vs deal. */
  stealDeal: number;
  /** A Twin Pack is in the cart. */
  hasTwin: boolean;
  stealDealEnabled: boolean;
  stealDealAmount: number;
  stealDealMin: number;
  total: number;
  coupon: string | null;
  freeShippingAbove: number;
  /** Validates the code on the server (works for private assigned codes too). */
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  removeCoupon: () => void;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "swastik-cart-v1";
const COUPON_KEY = "swastik-coupon-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, coupons } = useCatalog();
  const { shippingFlat, freeShippingAbove, stealDealEnabled, stealDealAmount, stealDealMin } = useStoreSettings();
  const { session } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponRule, setCouponRule] = useState<CouponRule | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const mergedFor = useRef<string | null>(null);
  const [prompt, setPrompt] = useState<{ slug: string; size: string } | null>(null);
  const prompted = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(migrateLines(JSON.parse(raw) as CartLine[]));
      setCoupon(localStorage.getItem(COUPON_KEY));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // On sign-in, merge the guest cart with the saved cart (highest quantity wins).
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!hydrated || !userId || mergedFor.current === userId) return;
    mergedFor.current = userId;
    let cancelled = false;
    (async () => {
      try {
        const remote = migrateLines(await getMyCart());
        if (cancelled) return;
        setLines((local) => {
          const map = new Map<string, CartLine>();
          for (const l of [...remote, ...local]) {
            const key = `${l.slug}__${l.size}`;
            const found = map.get(key);
            map.set(key, found ? { ...found, qty: Math.max(found.qty, l.qty) } : { ...l });
          }
          const merged = [...map.values()];
          try {
            localStorage.setItem(KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
          return merged;
        });
      } catch {
        /* offline or not signed in yet — keep the local cart */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  // Keep the saved cart in step with the local one.
  useEffect(() => {
    if (!hydrated || !userId || mergedFor.current !== userId) return;
    const timer = setTimeout(() => {
      void syncMyCart({ data: { lines } }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [hydrated, userId, lines]);

  // A cart belongs to exactly one account. When the signed-in identity changes
  // (sign-out, or a different account on the same browser) the local cart is
  // wiped so one customer can never see another's basket.
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const previous = lastUserId.current;
    lastUserId.current = userId;
    if (previous && previous !== userId) {
      mergedFor.current = null;
      setLines([]);
      setCoupon(null);
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(COUPON_KEY);
      } catch {
        /* ignore */
      }
    }
    if (!userId) mergedFor.current = null;
  }, [hydrated, userId]);


  // Re-validate a restored coupon (e.g. after a reload) so private codes keep working.
  useEffect(() => {
    if (!hydrated || !coupon || couponRule?.code === coupon) return;
    let cancelled = false;
    validateCoupon({ data: { code: coupon } })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.coupon) {
          setCouponRule(res.coupon);
        } else {
          setCoupon(null);
          try {
            localStorage.removeItem(COUPON_KEY);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hydrated, coupon, couponRule]);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add: CartValue["add"] = useCallback(
    (slug, size, qty = 1, opts) => {
      const product = products.find((p) => p.slug === slug);
      if (!product) return;
      const resolved = size ?? defaultSizeOption(product)?.label ?? product.sizes[0] ?? "Standard";
      // Steal Deal upsell: once per product per visit, only for single packs with an in-stock Twin Pack.
      if (!opts?.skipUpsell && !prompted.current.has(slug)) {
        const opt = (product.sizeOptions ?? []).find((o) => o.label === resolved);
        const twin = opt ? matchingTwin(product, opt) : null;
        if (opt && twin && sizeAvailable(product, twin)) {
          prompted.current.add(slug);
          setPrompt({ slug, size: resolved });
        }
      }
      setLines((prev) => {
        const found = prev.find((l) => l.slug === slug && l.size === resolved);
        const next = found
          ? prev.map((l) => (l === found ? { ...l, qty: l.qty + qty } : l))
          : [...prev, { slug, size: resolved, qty }];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [products],
  );

  const setQty: CartValue["setQty"] = useCallback(
    (slug, size, qty) =>
      persist(
        qty <= 0
          ? lines.filter((l) => !(l.slug === slug && l.size === size))
          : lines.map((l) => (l.slug === slug && l.size === size ? { ...l, qty } : l)),
      ),
    [lines, persist],
  );

  const remove: CartValue["remove"] = useCallback(
    (slug, size) => persist(lines.filter((l) => !(l.slug === slug && l.size === size))),
    [lines, persist],
  );

  const clear = useCallback(() => {
    persist([]);
    setCoupon(null);
    try {
      localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, [persist]);

  const value = useMemo<CartValue>(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = products.find((x) => x.slug === l.slug);
      return sum + (p ? priceForSize(p, l.size) * l.qty : 0);
    }, 0);
    // The validated rule wins; the public list covers codes seen before validation returns.
    const active =
      (couponRule && couponRule.code === coupon ? couponRule : undefined) ??
      (coupon ? coupons.find((c) => c.code === coupon) : undefined);
    let discount = 0;
    if (active && subtotal >= active.min_order_amount) {
      discount =
        active.discount_type === "fixed"
          ? Math.min(active.discount_value, subtotal)
          : Math.round((subtotal * active.discount_value) / 100);
      if (active.max_discount !== null) discount = Math.min(discount, active.max_discount);
      discount = Math.min(discount, subtotal);
    }
    const hasTwin = lines.some((l) => {
      const p = products.find((x) => x.slug === l.slug);
      return isTwinPack(p?.sizeOptions?.find((o) => o.label === l.size));
    });
    // Steal Deal mirrors the server rule: the customer always gets the bigger of coupon vs deal.
    let stealDeal = 0;
    if (stealDealEnabled && hasTwin && subtotal >= stealDealMin && stealDealAmount > 0) {
      stealDeal = stealDealAmount;
    }
    if (stealDeal > discount) {
      discount = 0;
    } else {
      stealDeal = 0;
    }
    const shipping = subtotal === 0 || subtotal - discount >= freeShippingAbove ? 0 : shippingFlat;
    return {
      lines,
      add,
      setQty,
      remove,
      clear,
      // Badge counts distinct products, not total quantity.
      count: lines.length,
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      shipping,
      discount,
      stealDeal,
      hasTwin,
      stealDealEnabled,
      stealDealAmount,
      stealDealMin,
      total: subtotal - discount - stealDeal + shipping,
      coupon,
      freeShippingAbove,
      applyCoupon: async (code: string) => {
        const normalized = code.trim().toUpperCase();
        try {
          const res = await validateCoupon({ data: { code: normalized } });
          if (!res.ok || !res.coupon) return { ok: false, message: res.message ?? "This code is not valid" };
          setCouponRule(res.coupon);
          setCoupon(res.coupon.code);
          try {
            localStorage.setItem(COUPON_KEY, res.coupon.code);
          } catch {
            /* ignore */
          }
          return { ok: true };
        } catch {
          return { ok: false, message: "Could not check this code right now. Please try again." };
        }
      },
      removeCoupon: () => {
        setCoupon(null);
        setCouponRule(null);
        try {
          localStorage.removeItem(COUPON_KEY);
        } catch {
          /* ignore */
        }
      },
    };
  }, [lines, coupon, couponRule, coupons, products, add, setQty, remove, clear, shippingFlat, freeShippingAbove, stealDealEnabled, stealDealAmount, stealDealMin]);

  const promptData = useMemo(() => {
    if (!prompt) return null;
    const product = products.find((p) => p.slug === prompt.slug);
    const single = product?.sizeOptions?.find((o) => o.label === prompt.size);
    const twin = product && single ? matchingTwin(product, single) : null;
    if (!product || !single || !twin || !sizeAvailable(product, twin)) return null;
    return { product, single, twin };
  }, [prompt, products]);

  const upgradeToTwin = useCallback(() => {
    if (!promptData) return;
    setQty(promptData.product.slug, promptData.single.label, 0);
    add(promptData.product.slug, promptData.twin.label, 1, { skipUpsell: true });
    setPrompt(null);
  }, [promptData, setQty, add]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {promptData && (
        <StealDealPopup
          productName={promptData.product.name}
          image={promptData.twin.image ?? promptData.product.image}
          single={promptData.single}
          twin={promptData.twin}
          product={promptData.product}
          dealAmount={stealDealAmount}
          dealMin={stealDealMin}
          dealEnabled={stealDealEnabled}
          onClose={() => setPrompt(null)}
          onUpgrade={upgradeToTwin}
        />
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}