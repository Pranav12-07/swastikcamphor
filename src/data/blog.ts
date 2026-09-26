export type BlogPost = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  keywords: string;
  tag: string;
  read: string;
  date: string;
  image: string;
  imageAlt: string;
  excerpt: string;
  /** Body blocks: heading + paragraphs, with optional product links. */
  sections: Array<{
    heading: string;
    paragraphs: string[];
    links?: Array<{ to: string; label: string }>;
  }>;
  faqs?: Array<{ q: string; a: string }>;
};

import tablets from "@/assets/product-tablets.jpg";
import bhimseni from "@/assets/product-bhimseni.jpg";
import cones from "@/assets/product-cones.jpg";
import gift from "@/assets/product-giftpack.jpg";
import about from "@/assets/about.jpg";
import hero from "@/assets/hero.jpg";

export const blogPosts: BlogPost[] = [
  {
    slug: "camphor-benefits-for-pooja",
    title: "Camphor benefits for pooja: why every aarti ends with a camphor flame",
    seoTitle: "Camphor Benefits for Pooja — Why Aarti Ends With Camphor | Swastik Camphor",
    description:
      "Discover the benefits of pooja camphor in daily worship — clean burn, no residue, purifying fragrance — and how to choose 100% pure camphor tablets online.",
    keywords:
      "camphor benefits, pooja camphor, camphor for aarti, pure camphor tablets, buy camphor online",
    tag: "Rituals",
    read: "5 min read",
    date: "2026-01-12",
    image: about,
    imageAlt: "Camphor flame burning in a brass aarti plate during pooja",
    excerpt:
      "Camphor burns completely without leaving a trace — a symbol of the ego dissolving in divine light. Here is why every aarti ends with a camphor flame.",
    sections: [
      {
        heading: "Why camphor is used in pooja",
        paragraphs: [
          "Camphor (karpuram) is the only common offering that burns away completely, leaving no ash and no residue. In Hindu tradition this total surrender to the flame symbolises the dissolving of the ego in divine light, which is why the aarti thali always closes with a camphor flame.",
          "Practically, pooja camphor also lights instantly, burns with a bright steady flame and leaves behind a clean, cooling fragrance that settles the mind before prayer.",
        ],
      },
      {
        heading: "The everyday benefits of pure camphor",
        paragraphs: [
          "Pure camphor purifies the air in a closed prayer room, masks stale odours, and is traditionally used to keep insects away from wardrobes and storage.",
          "The key word is pure. Camphor cut with paraffin or fillers produces soot, blackens your aarti plate and gives off an acrid smell. 100% pure camphor sublimates cleanly — nothing to scrape off, nothing to wipe away.",
        ],
        links: [
          { to: "/products", label: "Shop pure camphor tablets" },
          { to: "/products", label: "Shop Bhimseni camphor" },
        ],
      },
      {
        heading: "How much camphor do you need for daily aarti?",
        paragraphs: [
          "One small tablet per aarti is enough for a home shrine; temples and larger halls typically use two to four. A 100 g pack of Swastik Camphor tablets covers roughly a month of twice-daily worship.",
          "Store camphor in an airtight container away from direct sunlight — it sublimates in open air and slowly loses weight and fragrance.",
        ],
        links: [{ to: "/products", label: "Browse all camphor products" }],
      },
    ],
    faqs: [
      {
        q: "Is camphor safe to burn indoors?",
        a: "Yes, when you use 100% pure camphor in a ventilated room and a proper metal holder. Avoid burning large quantities in a sealed space.",
      },
      {
        q: "Which camphor is best for pooja?",
        a: "Pure white camphor tablets are the standard for aarti. Bhimseni camphor is preferred where a natural, more aromatic and cooling camphor is wanted.",
      },
    ],
  },
  {
    slug: "bhimseni-vs-synthetic-camphor",
    title: "Bhimseni vs synthetic camphor: how to tell the difference",
    seoTitle: "Bhimseni Camphor vs Synthetic Camphor — Purity Test Guide | Swastik Camphor",
    description:
      "Learn the difference between natural Bhimseni camphor and synthetic camphor, simple purity tests you can do at home, and where to buy pure camphor online in India.",
    keywords:
      "bhimseni camphor, natural camphor, synthetic camphor, camphor purity test, camphor manufacturer India",
    tag: "Buying guide",
    read: "6 min read",
    date: "2026-02-04",
    image: bhimseni,
    imageAlt: "Natural Bhimseni camphor crystals in a wooden bowl",
    excerpt:
      "Natural Bhimseni camphor is cooling, aromatic and Ayurveda-friendly. Learn the simple tests that identify genuinely pure camphor.",
    sections: [
      {
        heading: "What is Bhimseni camphor?",
        paragraphs: [
          "Bhimseni camphor (also called Nagi or edible-grade camphor) is derived from the camphor tree rather than petrochemicals. It forms irregular, slightly translucent crystals and carries a softer, cooling aroma.",
          "Synthetic camphor is manufactured from turpentine, pressed into uniform white tablets, and is intended for burning only.",
        ],
        links: [{ to: "/products", label: "Buy Bhimseni camphor online" }],
      },
      {
        heading: "Three quick purity tests",
        paragraphs: [
          "Burn test: pure camphor burns fully and leaves no black residue on a steel plate. Any oily ring or soot points to fillers.",
          "Water test: pure camphor pieces float and dance on water. Adulterated tablets sink or dissolve into a cloudy film.",
          "Aroma test: pure camphor smells clean and cooling. A sharp chemical or kerosene note means paraffin has been mixed in.",
        ],
      },
      {
        heading: "Buying from a camphor manufacturer instead of a reseller",
        paragraphs: [
          "Buying directly from a camphor manufacturer means fresher stock, batch-level quality checks and honest labelling of grade and weight. Swastik Camphor has manufactured and supplied camphor from Hyderabad since 1976, serving households, temples and bulk buyers across India.",
        ],
        links: [
          { to: "/about", label: "About Swastik Camphor" },
          { to: "/contact", label: "Talk to our team about bulk supply" },
        ],
      },
    ],
    faqs: [
      {
        q: "Is Bhimseni camphor edible?",
        a: "Edible-grade Bhimseni camphor is used in tiny quantities in some traditional preparations. Always check the grade on the pack and consult a qualified practitioner.",
      },
    ],
  },
  {
    slug: "how-to-burn-camphor-safely",
    title: "Five safe ways to burn camphor at home",
    seoTitle: "How to Burn Camphor Safely at Home — 5 Practical Tips | Swastik Camphor",
    description:
      "Camphor safety tips for daily pooja: correct holders, ventilation, safe distances, storage and what never to do when burning camphor tablets at home.",
    keywords: "how to burn camphor, camphor safety, camphor tablets, pooja camphor, camphor holder",
    tag: "Safety",
    read: "4 min read",
    date: "2026-03-09",
    image: tablets,
    imageAlt: "Pure white camphor tablets arranged beside a brass camphor holder",
    excerpt:
      "Ventilation, the right holder and safe distances — small habits that keep daily pooja beautiful and worry free.",
    sections: [
      {
        heading: "1. Always use a metal or stone holder",
        paragraphs: [
          "Camphor melts before it burns. A deep brass or steel aarti holder contains the melt and prevents it from spreading onto cloth or wood.",
        ],
      },
      {
        heading: "2. Keep the room ventilated",
        paragraphs: [
          "Crack a window or door. Even pure camphor consumes oxygen, and ventilation keeps the fragrance pleasant rather than overwhelming.",
        ],
      },
      {
        heading: "3. Burn one tablet at a time",
        paragraphs: [
          "One tablet gives a full aarti's worth of flame. Stacking several tablets creates a taller, less predictable flame.",
        ],
        links: [{ to: "/products", label: "Shop camphor tablets" }],
      },
      {
        heading: "4. Store it airtight",
        paragraphs: [
          "Camphor evaporates in open air. Keep it in a sealed jar away from heat, sunlight and children.",
        ],
      },
      {
        heading: "5. Never use camphor near curtains or loose clothing",
        paragraphs: [
          "Place the holder on a stable, non-flammable surface with at least an arm's length of clear space around it, and never leave a lit flame unattended.",
        ],
        links: [{ to: "/faq", label: "More camphor questions answered" }],
      },
    ],
  },
  {
    slug: "camphor-uses-beyond-pooja",
    title: "Camphor beyond pooja: freshness, wardrobes and wellness",
    seoTitle: "Everyday Camphor Uses at Home — Beyond Pooja | Swastik Camphor",
    description:
      "Beyond aarti, camphor freshens rooms, protects wardrobes and features in traditional Indian remedies. Practical everyday camphor uses and product picks.",
    keywords: "camphor uses, camphor for wardrobe, camphor at home, camphor supplier, buy camphor online",
    tag: "Wellness",
    read: "4 min read",
    date: "2026-04-18",
    image: cones,
    imageAlt: "Camphor cones placed on a wooden tray beside folded clothes",
    excerpt:
      "From repelling insects naturally to freshening a wardrobe, camphor has a place in every corner of an Indian home.",
    sections: [
      {
        heading: "A natural room freshener",
        paragraphs: [
          "A camphor cone lit for a minute leaves a clean, cooling fragrance that lingers for hours — far gentler than a synthetic spray.",
        ],
        links: [{ to: "/products", label: "Shop camphor cones" }],
      },
      {
        heading: "Wardrobe and storage protection",
        paragraphs: [
          "Placing a few camphor tablets in a muslin pouch keeps silverfish and moths away from sarees, woollens and stored linen. Replace the pouch every few weeks as the camphor sublimates.",
        ],
      },
      {
        heading: "Traditional wellness use",
        paragraphs: [
          "Camphor has long been used in Indian households in balms and steam inhalation for a blocked nose. Use only pure, clearly labelled camphor and follow guidance from a qualified practitioner.",
        ],
        links: [{ to: "/products", label: "See the pooja gift pack" }],
      },
    ],
  },
  {
    slug: "buy-camphor-online-india-guide",
    title: "How to buy camphor online in India without getting cheated",
    seoTitle: "Buy Camphor Online in India — Purity, Price & Packing Guide | Swastik Camphor",
    description:
      "A practical guide to buying camphor online in India: how to read purity claims, compare price per gram, check packing, and order direct from a camphor manufacturer.",
    keywords:
      "buy camphor online, camphor price, camphor supplier India, camphor manufacturer, pure camphor online",
    tag: "Buying guide",
    read: "5 min read",
    date: "2026-05-22",
    image: hero,
    imageAlt: "Packs of pure camphor tablets ready for online dispatch",
    excerpt:
      "Purity claims, price per gram, packing quality and dispatch speed — the four things that actually matter when you buy camphor online.",
    sections: [
      {
        heading: "Compare price per gram, not per pack",
        paragraphs: [
          "Camphor packs come in 50 g, 100 g, 250 g and 1 kg. Divide price by grams before you compare listings — a cheap-looking pack is often the smallest one.",
        ],
        links: [{ to: "/products", label: "See camphor prices and pack sizes" }],
      },
      {
        heading: "Look for a stated purity and grade",
        paragraphs: [
          "A trustworthy listing states the grade (pure camphor tablets, Bhimseni, cones) and confirms it is free from paraffin and fillers. Vague wording like 'premium quality' with no grade is a red flag.",
        ],
      },
      {
        heading: "Check packing and dispatch",
        paragraphs: [
          "Camphor sublimates, so it must ship in sealed, airtight packing. Ask how quickly the seller dispatches; older stock arrives lighter than the labelled weight.",
          "Ordering directly from the manufacturer removes the middle layers — you get fresh batches, consistent quality and a real person to call if something is wrong.",
        ],
        links: [
          { to: "/contact", label: "Contact Swastik Camphor" },
          { to: "/products", label: "Buy camphor online" },
        ],
      },
    ],
  },
  {
    slug: "camphor-for-festivals-and-gifting",
    title: "Camphor for festivals: Diwali, Navratri and pooja gifting ideas",
    seoTitle: "Camphor for Diwali & Navratri — Festival Pooja Gifting Ideas | Swastik Camphor",
    description:
      "Plan your festival pooja with the right camphor quantities, and discover pooja gift packs that make a thoughtful, traditional Diwali or Navratri gift.",
    keywords: "camphor for diwali, navratri pooja camphor, pooja gift pack, camphor gift, pooja camphor",
    tag: "Festivals",
    read: "4 min read",
    date: "2026-06-30",
    image: gift,
    imageAlt: "Swastik Camphor pooja gift pack presented with festive decorations",
    excerpt:
      "How much camphor a festival pooja actually needs, and why a pooja gift pack is one of the most welcome gifts you can give.",
    sections: [
      {
        heading: "How much camphor for a festival pooja",
        paragraphs: [
          "A home Diwali pooja typically uses 8–12 tablets across the evening; a Navratri nine-day observance runs comfortably on a 250 g pack.",
        ],
        links: [{ to: "/products", label: "Stock up on camphor tablets" }],
      },
      {
        heading: "Why a pooja gift pack works",
        paragraphs: [
          "A curated pack of camphor, cones and Bhimseni crystals is useful, traditional and appropriate for every household — an easy gift for housewarmings, weddings and festival hampers.",
        ],
        links: [{ to: "/products", label: "View the pooja gift pack" }],
      },
      {
        heading: "Order early for festival delivery",
        paragraphs: [
          "Courier networks slow down in festival weeks. Ordering a fortnight ahead keeps your pooja preparations stress free, and bulk buyers can reach our team directly for temple and community quantities.",
        ],
        links: [{ to: "/contact", label: "Enquire about bulk orders" }],
      },
    ],
  },
];

export const getPost = (slug: string) => blogPosts.find((p) => p.slug === slug);
