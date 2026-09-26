/**
 * Client-side PDF receipt for a verified paid order.
 * Loaded lazily so jsPDF never ships in the initial bundle.
 */
export type ReceiptData = {
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: Array<{ name: string; size: string; qty: number; price: number }>;
  subtotal: number;
  shipping: number;
  discount: number;
  stealDealDiscount?: number;
  tax: number;
  total: number;
};

const rupees = (n: number) => `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export async function buildReceiptDoc(data: ReceiptData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 48;
  const right = pageWidth - 48;
  let y = 60;

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(153, 27, 27);
  doc.text("SWASTIK CAMPHOR", left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  y += 16;
  doc.text("ESTD 1968  •  Pure Camphor. Pure Tradition.", left, y);

  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", right, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text("PAYMENT COMPLETED", right, 78, { align: "right" });

  y += 18;
  doc.setDrawColor(212, 175, 55);
  doc.line(left, y, right, y);
  y += 24;

  const row = (label: string, value: string) => {
    doc.setTextColor(110);
    doc.setFontSize(9);
    doc.text(label, left, y);
    doc.setTextColor(20);
    doc.setFontSize(11);
    doc.text(value, left + 140, y);
    y += 18;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Order details", left, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  row("Order ID", `#${data.orderNumber}`);
  row("Date", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  row("Payment status", data.paymentStatus.toUpperCase());
  row("Payment method", data.paymentMethod);
  if (data.paymentReference) row("Payment reference", data.paymentReference);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Billed to", left, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  for (const line of [data.customerName, data.email, data.phone, ...doc.splitTextToSize(data.address, right - left)]) {
    doc.text(String(line), left, y);
    y += 14;
  }

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Item", left, y);
  doc.text("Qty", right - 190, y, { align: "right" });
  doc.text("Unit", right - 100, y, { align: "right" });
  doc.text("Total", right, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.line(left, y, right, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40);
  for (const item of data.items) {
    const label = item.size ? `${item.name} (${item.size})` : item.name;
    const wrapped: string[] = doc.splitTextToSize(label, right - left - 220);
    doc.text(wrapped[0] ?? label, left, y);
    doc.text(String(item.qty), right - 190, y, { align: "right" });
    doc.text(rupees(item.price), right - 100, y, { align: "right" });
    doc.text(rupees(item.price * item.qty), right, y, { align: "right" });
    y += 16;
    for (const extra of wrapped.slice(1)) {
      doc.text(extra, left, y);
      y += 14;
    }
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }

  y += 6;
  doc.line(left, y, right, y);
  y += 18;

  const totalRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, right - 160, y, { align: "right" });
    doc.text(value, right, y, { align: "right" });
    y += bold ? 20 : 16;
  };
  totalRow("Subtotal", rupees(data.subtotal));
  if (data.discount > 0) totalRow("Discount", `- ${rupees(data.discount)}`);
  if ((data.stealDealDiscount ?? 0) > 0) totalRow("Steal Deal (Twin Pack)", `- ${rupees(data.stealDealDiscount ?? 0)}`);
  totalRow("Shipping", data.shipping === 0 ? "Free" : rupees(data.shipping));
  if (data.tax > 0) totalRow("Tax / GST", rupees(data.tax));
  totalRow("Total paid", rupees(data.total), true);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Payment verified by our payment gateway. This is a computer-generated receipt and needs no signature.",
    left,
    y,
    { maxWidth: right - left },
  );
  y += 26;
  doc.text("Thank you for shopping with Swastik Camphor — shop@online.swastikcamphor.in", left, y);

  return doc;
}

export async function downloadReceiptPdf(data: ReceiptData) {
  const doc = await buildReceiptDoc(data);
  doc.save(`Swastik-Camphor-Receipt-${data.orderNumber}.pdf`);
}
