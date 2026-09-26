import { Store, Flame, Truck } from "lucide-react";
import { companyProfile, site } from "@/config/site";
import { useI18n } from "@/lib/i18n";

/** Proof points from the Swastik company profile, shown as the company's own statements. */
export function TrustStrip() {
  const { t } = useI18n();
  const stats = [
    { icon: Store, value: companyProfile.retailStores, label: t("retail stores across India") },
    { icon: Flame, value: `${t("Since")} ${site.established}`, label: t("Crafting camphor since generations") },
    { icon: Truck, value: t("Pan-India"), label: t("delivery, dispatched in 1–2 days") },
  ];

  return (
    <section aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
      <div className="card-premium reveal p-5 md:p-10">
        <h2 id="trust-heading" className="text-center text-2xl md:text-3xl">
          {t("Trusted across India")}
        </h2>
        <div className="gold-rule mx-auto mt-3 w-16" />
        <ul className="mt-6 grid grid-cols-3 gap-3 text-center md:mt-8 md:gap-6">
          {stats.map((s) => (
            <li key={s.label} className="flex flex-col items-center">
              <s.icon className="h-5 w-5 text-accent md:h-6 md:w-6" aria-hidden="true" />
              <p className="mt-2 font-display text-xl text-primary md:mt-3 md:text-3xl">{s.value}</p>
              <p className="mt-1 line-clamp-3 max-w-[16rem] text-xs text-muted-foreground md:text-sm">{s.label}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs uppercase tracking-[0.24em] text-muted-foreground md:mt-8">{t("Also on the shelves at")}</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {companyProfile.retailPartners.map((name) => (
            <li key={name} className="rounded-full border border-gold/40 px-3 py-1 text-sm">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
