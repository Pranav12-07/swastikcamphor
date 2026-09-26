import { Landmark, Store, Flame } from "lucide-react";
import { companyProfile, site } from "@/config/site";
import { useI18n } from "@/lib/i18n";

/** Proof points from the Swastik company profile (2024), shown as the company's own statements. */
export function TrustStrip() {
  const { t } = useI18n();
  const stats = [
    { icon: Store, value: companyProfile.retailStores, label: t("retail stores across Telangana") },
    { icon: Landmark, value: `${companyProfile.ayodhyaKg} kg`, label: t("of Swastik Camphor offered for the Ayodhya Temple opening") },
    { icon: Flame, value: `ESTD ${site.established}`, label: t("making pure camphor in Hyderabad") },
  ];

  return (
    <section aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
      <div className="card-premium reveal p-6 md:p-10">
        <h2 id="trust-heading" className="text-center text-2xl md:text-3xl">
          {t("Trusted across Telangana")}
        </h2>
        <div className="gold-rule mx-auto mt-3 w-16" />
        <ul className="mt-8 grid gap-6 text-center sm:grid-cols-3">
          {stats.map((s) => (
            <li key={s.label} className="flex flex-col items-center">
              <s.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              <p className="mt-3 font-display text-3xl text-primary">{s.value}</p>
              <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">{s.label}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("Also on the shelves at")}</p>
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
