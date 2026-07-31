export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-gold/20 bg-secondary/50">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-gold)" }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        {eyebrow && (
          <p className="animate-rise-in text-xs uppercase tracking-[0.32em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="animate-rise-in mt-3 text-4xl leading-tight md:text-5xl">{title}</h1>
        <div className="gold-rule mt-5 w-24" />
        {subtitle && (
          <p className="animate-rise-in mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}