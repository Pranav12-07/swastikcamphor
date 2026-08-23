/**
 * Server-side generation + hosting of the branded PDF receipt.
 * Uses the exact same layout as the customer-facing download.
 */
import { buildReceiptDoc, type ReceiptData } from "@/lib/receipt";

const BUCKET = "receipts";
/** Signed link validity: 1 year, so the emailed receipt stays usable. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await buildReceiptDoc(data);
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

/**
 * Renders the receipt, stores it privately and returns a long-lived signed URL.
 * Returns null when generation or upload fails — emails must still go out.
 */
export async function storeReceiptPdf(data: ReceiptData): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = await generateReceiptPdf(data);
    const path = `${data.orderNumber}/Swastik-Camphor-Receipt-${data.orderNumber}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) {
      console.error("receipt upload failed", uploadError);
      return null;
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL, { download: `Swastik-Camphor-Receipt-${data.orderNumber}.pdf` });
    if (error || !signed?.signedUrl) {
      console.error("receipt signing failed", error);
      return null;
    }
    return signed.signedUrl;
  } catch (error) {
    console.error("receipt generation failed", error);
    return null;
  }
}
