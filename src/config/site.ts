export const site = {
  name: "Swastik Camphor",
  legalName: "VIJAYASREE CAMPHOR INDUSTRIES",
  tagline: "Purity in every tablet",
  email: "info@swastikcamphor.in",
  phone: "+91 7416886881",
  phoneHref: "+917416886881",
  whatsapp: "917416886881",
  address: {
    line1: "8-1-40/189, Samatha Colony",
    line2: "Shaikpet, Hyderabad – 500008",
    state: "Telangana, India",
    full: "8-1-40/189, Samatha Colony, Shaikpet, Hyderabad, Telangana, 500008",
  },
  geo: { lat: 17.4059, lng: 78.3922 },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=8-1-40%2F189%2C+Samatha+Colony%2C+Shaikpet%2C+Hyderabad%2C+Telangana+500008",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=8-1-40%2F189%2C+Samatha+Colony%2C+Shaikpet%2C+Hyderabad%2C+Telangana+500008",
  mapEmbedUrl:
    "https://maps.google.com/maps?q=8-1-40%2F189%2C+Samatha+Colony%2C+Shaikpet%2C+Hyderabad%2C+Telangana+500008&z=16&ie=UTF8&output=embed&hl=en-IN&gl=in",
} as const;

/**
 * UPI collection details used for Google Pay / PhonePe / any UPI app payments.
 * Replace `vpa` with your own UPI ID to receive money in your account.
 */
export const upi = {
  vpa: "msvijayasreecamphorindustries.eazypay@icici",
  payeeName: "MS Vijaya Sree Camphor Industries",
} as const;

/** Single source of truth for every social link on the site. */
export type SocialPlatform = {
  id: string;
  label: string;
  url: string | null;
  comingSoon?: boolean;
  brandColor: string;
};

export const socialLinks: SocialPlatform[] = [
  {
    id: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/61556172086307/videos/purity-in-every-swastik-camphor-tablet/3827568620817100/",
    brandColor: "#1877F2",
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/swastik_camphor/",
    brandColor: "#E1306C",
  },
];

export const marketplaces = [
  { id: "amazon", label: "Amazon", url: "https://www.amazon.in/s?k=swastik+camphor" },
  { id: "flipkart", label: "Flipkart Minutes", url: "https://www.flipkart.com/search?q=swastik+camphor&as=on&as-show=on&marketplace=HYPERLOCAL&otracker=AS_Query_HistoryAutoSuggest_1_4_na_na_na&otracker1=AS_Query_HistoryAutoSuggest_1_4_na_na_na&as-pos=1&as-type=HISTORY&suggestionId=swastik+camphor&requestId=aeaaa9c4-a055-4509-94c6-d4b498a2fe1e&as-searchtext=swas&pageUID=1789574348544" },
  
];

export const mainNav = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Shop", to: "/shop" },
  { label: "Our Products", to: "/products" },
  { label: "Blogs", to: "/blogs" },
  { label: "Contact Us", to: "/contact" },
] as const;

export const supportNav = [
  { label: "FAQ", to: "/faq" },
  { label: "Track Order", to: "/track-order" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms-and-conditions" },
  { label: "Return & Refund Policy", to: "/return-refund-policy" },
  { label: "Contact Us", to: "/contact" },
] as const;