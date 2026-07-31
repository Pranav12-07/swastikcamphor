export const site = {
  name: "Swastik Camphor",
  tagline: "Purity in every tablet",
  email: "info@swastikcamphor.in",
  phone: "+91 7416886881",
  phoneHref: "+917416886881",
  whatsapp: "917416886881",
  address: {
    line1: "Plot 185, Shaikpet",
    line2: "Hyderabad – 500008",
    state: "Telangana, India",
    full: "Plot 185, Shaikpet, Hyderabad – 500008, Telangana, India",
  },
  geo: { lat: 17.436849, lng: 78.366946 },
  mapsUrl:
    "https://www.google.com/maps?ll=17.436849,78.366946&z=10&t=m&hl=en-IN&gl=US&mapclient=embed&q=Plot+185,+Shaikpet,+Hyderabad-500008",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=17.436849,78.366946&destination_place_id=Swastik+Camphor",
  mapEmbedUrl:
    "https://www.google.com/maps?q=Plot+185,+Shaikpet,+Hyderabad-500008&ll=17.436849,78.366946&z=15&output=embed&hl=en-IN",
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
  { id: "linkedin", label: "LinkedIn", url: null, comingSoon: true, brandColor: "#0A66C2" },
  { id: "x", label: "X (Twitter)", url: null, comingSoon: true, brandColor: "#111111" },
];

export const marketplaces = [
  { id: "amazon", label: "Amazon", url: "https://www.amazon.in/s?k=swastik+camphor" },
  { id: "flipkart", label: "Flipkart", url: "https://www.flipkart.com/search?q=swastik%20camphor" },
  { id: "jiomart", label: "JioMart", url: "https://www.jiomart.com/search/swastik%20camphor" },
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
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms-and-conditions" },
  { label: "Return & Refund Policy", to: "/return-refund-policy" },
  { label: "Contact Us", to: "/contact" },
] as const;