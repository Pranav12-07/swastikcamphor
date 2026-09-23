import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations } from "@/lib/translations";

export type Language = "en" | "te" | "hi";

export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "te", label: "తెలుగు", short: "TE" },
  { code: "hi", label: "हिंदी", short: "HI" },
];

const STORAGE_KEY = "swastik-lang";

/** English source string -> translation. Missing keys fall back to English. */
const legacyDictionary: Record<Exclude<Language, "en">, Record<string, string>> = {
  te: {
    // Navigation
    "Home": "హోమ్",
    "About Us": "మా గురించి",
    "Shop": "షాప్",
    "Our Products": "మా ఉత్పత్తులు",
    "Blogs": "బ్లాగులు",
    "Contact Us": "సంప్రదించండి",
    "FAQ": "తరచుగా అడిగే ప్రశ్నలు",
    "Track Order": "ఆర్డర్ ట్రాక్ చేయండి",
    "Privacy Policy": "గోప్యతా విధానం",
    "Terms & Conditions": "నిబంధనలు & షరతులు",
    "Return & Refund Policy": "రిటర్న్ & రీఫండ్ విధానం",
    // Header
    "Admin": "అడ్మిన్",
    "Sign in": "సైన్ ఇన్",
    "Sign out": "సైన్ అవుట్",
    "My account": "నా ఖాతా",
    "Wishlist": "విష్‌లిస్ట్",
    "Cart": "కార్ట్",
    "Language": "భాష",
    // Home
    "Shop Now": "ఇప్పుడే కొనండి",
    "Explore Products": "ఉత్పత్తులు చూడండి",
    "100% Purity": "100% స్వచ్ఛత",
    "No chemicals, no fillers — only pure camphor.": "రసాయనాలు లేవు, కల్తీ లేదు — కేవలం స్వచ్ఛమైన కర్పూరం.",
    "Clean Burn": "శుభ్రమైన మంట",
    "Bright, steady flame that leaves no black residue.": "నల్లటి మసి వదలని ప్రకాశవంతమైన స్థిరమైన మంట.",
    "Long Lasting": "ఎక్కువ సేపు ఉంటుంది",
    "Consistent burning performance.": "స్థిరమైన మండే నాణ్యత.",
    "Pan-India Delivery": "భారతదేశమంతటా డెలివరీ",
    "Dispatched in 1-2 days, delivered across India.": "1-2 రోజుల్లో పంపబడుతుంది, భారతదేశమంతటా డెలివరీ.",
    "Our range": "మా శ్రేణి",
    "Camphor for every ritual": "ప్రతి పూజకు కర్పూరం",
    "View all products →": "అన్ని ఉత్పత్తులు చూడండి →",
    "About us": "మా గురించి",
    "Rooted in tradition, refined by quality": "సంప్రదాయంలో పుట్టి, నాణ్యతతో తీర్చిదిద్దబడింది",
    "Read our story": "మా కథ చదవండి",
    "Also available online": "ఆన్‌లైన్‌లో కూడా లభ్యం",
    "Find Swastik Camphor on your favourite marketplace.": "మీకు ఇష్టమైన మార్కెట్‌ప్లేస్‌లో స్వస్తిక్ కర్పూరం పొందండి.",
    "Latest camphor guides": "తాజా కర్పూర సూచనలు",
    "Read all guides": "అన్ని సూచనలు చదవండి",
    // Product / cart
    "Add to cart": "కార్ట్‌లో చేర్చండి",
    "Add to Cart": "కార్ట్‌లో చేర్చండి",
    "Buy now": "ఇప్పుడే కొనండి",
    "Out of stock": "స్టాక్ లేదు",
    "View details": "వివరాలు చూడండి",
    // Footer
    "Explore": "అన్వేషించండి",
    "Quick Links": "త్వరిత లింక్‌లు",
    "Reach Us": "మమ్మల్ని చేరుకోండి",
    "Also available on": "ఇక్కడ కూడా లభ్యం",
    "100% pure, natural camphor crafted with devotion in Hyderabad — for pooja, aarti, aromatherapy and everyday freshness.":
      "హైదరాబాద్‌లో భక్తితో తయారు చేసిన 100% స్వచ్ఛమైన సహజ కర్పూరం — పూజ, ఆరతి, అరోమాథెరపీ మరియు రోజువారీ తాజాదనానికి.",
    "All rights reserved.": "సర్వ హక్కులు reserved.",
  },
  hi: {
    "Home": "होम",
    "About Us": "हमारे बारे में",
    "Shop": "शॉप",
    "Our Products": "हमारे उत्पाद",
    "Blogs": "ब्लॉग",
    "Contact Us": "संपर्क करें",
    "FAQ": "सामान्य प्रश्न",
    "Track Order": "ऑर्डर ट्रैक करें",
    "Privacy Policy": "गोपनीयता नीति",
    "Terms & Conditions": "नियम और शर्तें",
    "Return & Refund Policy": "वापसी और रिफंड नीति",
    "Admin": "एडमिन",
    "Sign in": "साइन इन",
    "Sign out": "साइन आउट",
    "My account": "मेरा खाता",
    "Wishlist": "विशलिस्ट",
    "Cart": "कार्ट",
    "Language": "भाषा",
    "Shop Now": "अभी खरीदें",
    "Explore Products": "उत्पाद देखें",
    "100% Purity": "100% शुद्धता",
    "No chemicals, no fillers — only pure camphor.": "कोई रसायन नहीं, कोई मिलावट नहीं — केवल शुद्ध कपूर।",
    "Clean Burn": "स्वच्छ ज्वाला",
    "Bright, steady flame that leaves no black residue.": "उज्ज्वल, स्थिर ज्वाला जो काली कालिख नहीं छोड़ती।",
    "Long Lasting": "लंबे समय तक चलने वाला",
    "Consistent burning performance.": "एक समान जलने की गुणवत्ता।",
    "Pan-India Delivery": "पूरे भारत में डिलीवरी",
    "Dispatched in 1-2 days, delivered across India.": "1-2 दिनों में डिस्पैच, पूरे भारत में डिलीवरी।",
    "Our range": "हमारी श्रृंखला",
    "Camphor for every ritual": "हर पूजा के लिए कपूर",
    "View all products →": "सभी उत्पाद देखें →",
    "About us": "हमारे बारे में",
    "Rooted in tradition, refined by quality": "परंपरा में जड़ें, गुणवत्ता से निखार",
    "Read our story": "हमारी कहानी पढ़ें",
    "Also available online": "ऑनलाइन भी उपलब्ध",
    "Find Swastik Camphor on your favourite marketplace.": "अपने पसंदीदा मार्केटप्लेस पर स्वस्तिक कपूर पाएं।",
    "Latest camphor guides": "नवीनतम कपूर गाइड",
    "Read all guides": "सभी गाइड पढ़ें",
    "Add to cart": "कार्ट में डालें",
    "Add to Cart": "कार्ट में डालें",
    "Buy now": "अभी खरीदें",
    "Out of stock": "स्टॉक में नहीं",
    "View details": "विवरण देखें",
    "Explore": "अन्वेषण करें",
    "Quick Links": "त्वरित लिंक",
    "Reach Us": "हमसे संपर्क",
    "Also available on": "यहाँ भी उपलब्ध",
    "100% pure, natural camphor crafted with devotion in Hyderabad — for pooja, aarti, aromatherapy and everyday freshness.":
      "हैदराबाद में श्रद्धा से बनाया गया 100% शुद्ध, प्राकृतिक कपूर — पूजा, आरती, अरोमाथेरेपी और रोज़ की ताज़गी के लिए।",
    "All rights reserved.": "सर्वाधिकार सुरक्षित।",
  },
};

const dictionary: Record<Exclude<Language, "en">, Record<string, string>> = {
  te: { ...legacyDictionary.te, ...translations.te },
  hi: { ...legacyDictionary.hi, ...translations.hi },
};

const reverseDictionary = Object.fromEntries(
  Object.values(dictionary).flatMap((entries) => Object.entries(entries).map(([source, translated]) => [translated, source])),
) as Record<string, string>;

const translatedAttributes = ["placeholder", "title", "aria-label"] as const;

function sourceText(value: string) {
  return reverseDictionary[value] ?? value;
}

function translateVisibleText(value: string, lang: Language) {
  if (lang === "en") return sourceText(value);
  const entries = dictionary[lang];
  const exact = entries[sourceText(value)];
  if (exact) return exact;

  // Handles labels containing customer data, prices, counts, product names or IDs.
  let output = value;
  for (const [translated, source] of Object.entries(reverseDictionary).sort((a, b) => b[0].length - a[0].length)) {
    if (output.includes(translated)) output = output.replaceAll(translated, source);
  }
  for (const [source, translated] of Object.entries(entries).sort((a, b) => b[0].length - a[0].length)) {
    if (source.length >= 4 && output.includes(source)) output = output.replaceAll(source, translated);
  }
  return output;
}

function translateCustomerDocument(lang: Language) {
  if (typeof document === "undefined" || window.location.pathname.startsWith("/admin")) return;
  document.documentElement.lang = lang;
  const root = document.querySelector("main")?.parentElement ?? document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
      const raw = node.textContent ?? "";
      const trimmed = raw.trim();
      if (trimmed) {
        const next = translateVisibleText(trimmed, lang);
        if (next !== trimmed) node.textContent = raw.replace(trimmed, next);
      }
    }
    node = walker.nextNode();
  }
  root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]").forEach((element) => {
    translatedAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateVisibleText(value, lang));
    });
  });
}

type Ctx = { lang: Language; setLang: (l: Language) => void; t: (s: string) => string };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "en" || saved === "te" || saved === "hi") setLangState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let translating = false;
    const apply = () => {
      if (translating) return;
      translating = true;
      translateCustomerDocument(lang);
      translating = false;
    };
    apply();
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (source: string) => (lang === "en" ? source : (dictionary[lang]?.[source] ?? source)),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  // Safe fallback so components never crash outside the provider (e.g. admin shell).
  return { lang: "en", setLang: () => {}, t: (s: string) => s };
}
