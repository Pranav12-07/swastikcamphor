/**
 * Old single-listing URLs -> the new 3-product catalogue.
 * Each old product page 301-redirects to the new product with its pack pre-selected.
 */
export const OLD_SLUG_REDIRECTS: Record<string, { slug: string; size: string }> = {
  "swastik-100-pure-camphor-tablets-25-grams-jar-pack-of-2-50-grams": {
    slug: "camphor-tablets",
    size: "50 g Jar",
  },
  "swastik-100-pure-camphor-tablets-50-grams-jar": { slug: "camphor-tablets", size: "50 g Jar" },
  "swastik-100-pure-camphor-tablets-50-grams-jar-pack-of-2-100-grams": {
    slug: "camphor-tablets",
    size: "Twin Pack – 2 × 50 g Jars (100 g)",
  },
  "swastik-100-pure-camphor-tablets-100-grams-jar": { slug: "camphor-tablets", size: "100 g Jar" },
  "swastik-100-pure-camphor-tablets-100-grams-jar-pack-of-2": {
    slug: "camphor-tablets",
    size: "Twin Pack – 2 × 100 g Jars (200 g)",
  },
  "swastik-100-pure-camphor-tablets-100-grams-pouch": {
    slug: "camphor-tablets-refill-pouch",
    size: "100 g Refill Pouch",
  },
  "swastik-100-pure-camphor-tablets-250-grams-jar": { slug: "camphor-tablets", size: "250 g Jar" },
  "swastik-100-pure-camphor-tablets-250-grams-jar-pack-of-2-500-grams": {
    slug: "camphor-tablets",
    size: "Twin Pack – 2 × 250 g Jars (500 g)",
  },
  "swastik-100-pure-camphor-tablets-500-grams-jar": { slug: "camphor-tablets", size: "500 g Jar" },
  "swastik-100-pure-camphor-tablets-500-grams-jar-pack-of-2-1000-grams": {
    slug: "camphor-tablets",
    size: "Twin Pack – 2 × 500 g Jars (1 kg)",
  },
  "swastik-100-pure-bhimseni-camphor-50-grams-jar": { slug: "bhimseni-camphor", size: "50 g Jar" },
  "swastik-100-pure-bhimseni-camphor-50-grams-jar-pack-of-2-100-grams": {
    slug: "bhimseni-camphor",
    size: "50 g Jar",
  },
  "swastik-100-pure-bhimseni-camphor-100-grams-jar": { slug: "bhimseni-camphor", size: "100 g Jar" },
  "swastik-100-pure-bhimseni-camphor-100-grams-jar-pack-of-2": {
    slug: "bhimseni-camphor",
    size: "Twin Pack – 2 × 100 g Jars (200 g)",
  },
  "swastik-100-pure-bhimseni-camphor-250-grams-jar": { slug: "bhimseni-camphor", size: "250 g Jar" },
  "swastik-100-pure-bhimseni-camphor-250-grams-jar-pack-of-2": {
    slug: "bhimseni-camphor",
    size: "Twin Pack – 2 × 250 g Jars (500 g)",
  },
  "swastik-100-pure-bhimseni-camphor-450-grams-jar": { slug: "bhimseni-camphor", size: "450 g Jar" },
  "swastik-100-pure-bhimseni-camphor-450-grams-jar-pack-of-2-900-grams": {
    slug: "bhimseni-camphor",
    size: "Twin Pack – 2 × 450 g Jars (900 g)",
  },
};

/** Cart lines saved before the restructure: old slug -> new slug + pack label. */
export function migrateCartLine(slug: string, size: string): { slug: string; size: string } | null {
  const target = OLD_SLUG_REDIRECTS[slug];
  if (!target) return null;
  return { slug: target.slug, size: target.size };
}
