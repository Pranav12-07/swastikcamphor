import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { signInWithDetails } from "@/lib/login.functions";
import { sendWhatsAppOtp, verifyWhatsAppOtp } from "@/lib/whatsapp-auth.functions";
import { adminMe } from "@/lib/admin.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";


const searchSchema = z.object({
  /** Same-origin path to return to after signing in (e.g. /checkout). */
  redirect: z.string().startsWith("/").max(120).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Login — Swastik Camphor" },
      {
        name: "description",
        content:
          "Sign in to Swastik Camphor with your name, email and mobile number, or continue instantly with Google.",
      },
      { property: "og:title", content: "Login — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const formSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[^\d+]/g, "")), "Please enter a valid 10-digit mobile number."),
});

