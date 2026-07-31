import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { socialLinks } from "@/config/site";
import { cn } from "@/lib/utils";

const icons = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, x: Twitter } as const;

export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-3", className)}>
      {socialLinks.map((s) => {
        const Icon = icons[s.id as keyof typeof icons] ?? Facebook;
        const base =
          "grid h-10 w-10 place-items-center rounded-full border border-gold/40 transition-all duration-300";
        if (!s.url) {
          return (
            <li key={s.id}>
              <span
                aria-label={`${s.label} — coming soon`}
                title={`${s.label} — coming soon`}
                className={cn(base, "cursor-not-allowed opacity-40")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </li>
          );
        }
        return (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Swastik Camphor on ${s.label}`}
              className={cn(base, "hover:-translate-y-1 hover:border-gold hover:bg-gold/15")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}