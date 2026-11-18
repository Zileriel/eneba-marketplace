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

export const demoProducts = Array.from({ length: 100 }, (_, index) => {
  const serial = String(index + 1).padStart(3, "0");
  const productTypeIndex = index % productTypes.length;

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
  };
});
