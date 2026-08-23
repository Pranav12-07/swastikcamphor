import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/receipt-selftest")({
  server: {
    handlers: {
      GET: async () => {
        const { generateReceiptPdf } = await import("@/lib/receipt.server");
        const bytes = await generateReceiptPdf({
          orderNumber: "TEST123", paymentStatus: "paid", paymentMethod: "UPI", paymentReference: "T1",
          customerName: "Test", email: "t@t.com", phone: "9", address: "Addr, City, State - 500008",
          items: [{ name: "Camphor Tablets", size: "100g", qty: 2, price: 199 }],
          subtotal: 398, shipping: 49, discount: 0, tax: 0, total: 447,
        });
        return new Response(JSON.stringify({ bytes: bytes.length }), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
