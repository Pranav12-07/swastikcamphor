import { Globe } from "lucide-react";
import { LANGUAGES, useI18n, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]!;

  return (
    <label
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-gold/40 pl-2.5 pr-2 text-[0.7rem] font-medium transition-colors hover:bg-accent/15 sm:h-10 sm:text-xs",
        className,
      )}
    >
      <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
      <span className="hidden sm:inline">{current.short}</span>
      <select
        aria-label={t("Language")}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
