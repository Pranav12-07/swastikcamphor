import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phone: z
    .string()
    .trim()
    .transform((raw) => {
      const digits = raw.replace(/[^\d+]/g, "");
      if (/^\+91[6-9]\d{9}$/.test(digits)) return digits;
      if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
      if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
      return "";
    })
    .refine((v) => v.length === 13, "Please enter a valid 10-digit Indian mobile number."),
});

/**
 * Passwordless sign-in with name + email + phone (no OTP).
 * Matches or creates the customer account server-side and returns a single-use
 * token the browser exchanges for a real Supabase session.
 */
export const signInWithDetails = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => detailsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    let userId = (profile?.id as string | undefined) ?? null;

    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: data.full_name, phone: data.phone },
      });
      if (created?.user) {
        userId = created.user.id;
      } else if (createError && /already|registered|exists/i.test(createError.message)) {
        // Account exists in auth but not in profiles — fall through to the link mint.
        userId = null;
      } else {
        console.error("createUser failed", createError);
        throw new Error("We could not complete sign-in. Please try again.");
      }
    }

    if (userId) {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email,
          full_name: data.full_name,
          phone: data.phone,
          auth_method: "email",
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    }

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !link?.properties?.hashed_token) {
      console.error("generateLink failed", linkError);
      throw new Error("We could not complete sign-in. Please try again.");
    }

    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });
