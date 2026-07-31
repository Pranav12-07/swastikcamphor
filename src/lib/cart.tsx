import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COUPONS, FREE_SHIPPING_ABOVE, SHIPPING_FLAT, products } from "@/data/products";

export type CartLine = { slug: string; size: string; qty: number };

type CartValue = {
  lines: CartLine[];
  add: (slug: string, size?: string, qty?: number) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon: string | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "swastik-cart-v1";
const COUPON_KEY = "swastik-coupon-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
      setCoupon(localStorage.getItem(COUPON_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add: CartValue["add"] = useCallback(
    (slug, size, qty = 1) => {
      const product = products.find((p) => p.slug === slug);
      if (!product) return;
      const resolved = size ?? product.sizes[0] ?? "Standard";
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
    [],
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
      return sum + (p ? p.price * l.qty : 0);
    }, 0);
    const rate = coupon ? (COUPONS[coupon] ?? 0) : 0;
    const discount = Math.round(subtotal * rate);
    const shipping = subtotal === 0 || subtotal - discount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT;
    return {
      lines,
      add,
      setQty,
      remove,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      shipping,
      discount,
      total: subtotal - discount + shipping,
      coupon,
      applyCoupon: (code: string) => {
        const normalized = code.trim().toUpperCase();
        if (!COUPONS[normalized]) return false;
        setCoupon(normalized);
        try {
          localStorage.setItem(COUPON_KEY, normalized);
        } catch {
          /* ignore */
        }
        return true;
      },
      removeCoupon: () => {
        setCoupon(null);
        try {
          localStorage.removeItem(COUPON_KEY);
        } catch {
          /* ignore */
        }
      },
    };
  }, [lines, coupon, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}