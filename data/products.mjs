const namePrefixes = [
  "Aether",
  "Ashen",
  "Astral",
  "Cinder",
  "Crimson",
  "Distant",
  "Elder",
  "Emerald",
  "Frost",
  "Golden",
];

const nameTitles = [
  "Frontier",
  "Kingdom",
  "Protocol",
  "Odyssey",
  "Legacy",
  "Reckoning",
  "Horizons",
  "Rising",
  "Chronicles",
  "Echoes",
];

const productTypes = [
  "Žaidimai",
  "Papildiniai",
  "E. Kortelės",
  "Žaid. kortelės",
  "Žaidimo taškai",
  "E-money kortelės",
  "Prog. įranga",
  "Prenumerata",
];

const productNames = [
  "Digital Game",
  "Expansion Pack",
  "Gift Card",
  "Game Card",
  "Game Points",
  "E-Money Card",
  "Software License",
  "Subscription",
];

const platforms = [
  "Steam",
  "Xbox Live",
  "Razer",
  "EA App",
  "PlayStation Network",
  "Nintendo eShop",
  "Epic Games",
  "Ubisoft Connect",
  "Google Play",
  "Apple App Store",
];

const regions = [
  ["Europa"],
  ["JAV"],
  ["Visas Pasaulis"],
  ["Europa", "JAV"],
  ["Europa", "Visas Pasaulis"],
  ["JAV", "Visas Pasaulis"],
  ["Europa", "JAV", "Visas Pasaulis"],
];

const operatingSystems = [
  ["Windows"],
  ["Windows", "Mac"],
  ["Windows", "Linux"],
  ["Windows", "Mac", "Linux"],
  ["Android"],
  ["iOS"],
  ["Android", "iOS"],
  ["Windows", "Android"],
  ["Mac"],
  ["Windows", "iOS"],
];

const genres = [
  "Vieno žaidėjo režimas",
  "Veiksmo",
  "Nuotykių",
  "Vaidmenų žaidimai",
  "Strategija",
  "Simuliatoriai",
  "Šaudyklės",
  "Sportas",
  "Lenktynės",
  "Indie",
];

const countries = [
  "Lietuva",
  "Jungtinės Amerikos Valstijos",
  "Vokietija",
  "Lenkija",
  "Japonija",
  "Prancūzija",
  "Jungtinė Karalystė",
  "Ispanija",
];

const recommendedMockups = [
  {
    name: "Grand Theft Auto VI (PS5) PSN Key EUROPE",
    coverImage: "/images/banners/banner-1-collapsed.jpg",
    regions: ["Europa"],
    price: 72.83,
    moneyBackPercent: 14,
    platform: "PlayStation Network",
    productType: "Žaidimai",
    operatingSystems: [],
    genres: ["Veiksmo"],
    country: "Lietuva",
  },
  {
    name: "PlayStation Network Card 100 USD (USA) PSN Key UNITED STATES",
    coverImage: "/images/products/psn-network-card.svg",
    regions: ["JAV"],
    price: 89.78,
    moneyBackPercent: 5,
    platform: "PlayStation Network",
    productType: "E. Kortelės",
    operatingSystems: [],
    genres: [],
    country: "Jungtinės Amerikos Valstijos",
  },
  {
    name: "Grand Theft Auto VI: Ultimate Edition (Xbox Series X|S) XBOX LIVE",
    coverImage: "/images/banners/banner-1-collapsed.jpg",
    regions: ["Europa"],
    price: 81.99,
    moneyBackPercent: 14,
    platform: "Xbox Live",
    productType: "Žaidimai",
    operatingSystems: [],
    genres: ["Veiksmo", "Nuotykių"],
    country: "Lietuva",
  },
  {
    name: "Grand Theft Auto VI (Xbox Series X|S) XBOX LIVE Key EUROPE",
    coverImage: "/images/banners/banner-1-collapsed.jpg",
    regions: ["Visas Pasaulis"],
    price: 64.98,
    moneyBackPercent: 11,
    platform: "Xbox Live",
    productType: "Žaidimai",
    operatingSystems: [],
    genres: ["Veiksmo"],
    country: "Lietuva",
  },
  {
    name: "Grand Theft Auto VI: Ultimate Edition (Xbox Series X|S) XBOX LIVE GLOBAL",
    coverImage: "/images/banners/banner-1-collapsed.jpg",
    regions: ["Visas Pasaulis"],
    price: 82.1,
    moneyBackPercent: 11,
    platform: "Xbox Live",
    productType: "Žaidimai",
    operatingSystems: [],
    genres: ["Veiksmo", "Nuotykių"],
    country: "Lietuva",
  },
];

export const demoProducts = Array.from({ length: 100 }, (_, index) => {
  const serial = String(index + 1).padStart(3, "0");
  const productTypeIndex = index % productTypes.length;
  const isRecommended = index < recommendedMockups.length;

  return {
    id: `demo-product-${serial}`,
    coverImage: "/images/demo-product-cover.svg",
    name: `${namePrefixes[Math.floor(index / nameTitles.length)]} ${nameTitles[index % nameTitles.length]} ${productNames[productTypeIndex]}`,
    regions: regions[index % regions.length],
    price: Number((4.99 + ((index * 379) % 9000) / 100).toFixed(2)),
    currency: "EUR",
    moneyBackPercent: (index * 3) % 11,
    platform: platforms[index % platforms.length],
    productType: productTypes[productTypeIndex],
    operatingSystems: operatingSystems[index % operatingSystems.length],
    genres: [genres[index % genres.length]],
    country: countries[index % countries.length],
    productKey: `DEMO-NOT-REDEEMABLE-${serial}`,
    isDemo: true,
    isRecommended,
    ...(isRecommended
      ? {
          ...recommendedMockups[index],
          recommendedOrder: index + 1,
        }
      : {}),
  };
});
