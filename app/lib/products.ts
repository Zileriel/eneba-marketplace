export const PRODUCT_REGIONS = [
  "Europa",
  "JAV",
  "Visas Pasaulis",
] as const;
export type ProductRegion = (typeof PRODUCT_REGIONS)[number];

export const PRODUCT_TYPES = [
  "Žaidimai",
  "Papildiniai",
  "E. Kortelės",
  "Žaid. kortelės",
  "Žaidimo taškai",
  "E-money kortelės",
  "Prog. įranga",
  "Prenumerata",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_PLATFORMS = [
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
] as const;
export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];

export const PRODUCT_OPERATING_SYSTEMS = [
  "Windows",
  "Mac",
  "Linux",
  "Android",
  "iOS",
] as const;
export type ProductOperatingSystem =
  (typeof PRODUCT_OPERATING_SYSTEMS)[number];

export const PRODUCT_GENRES = [
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
] as const;
export type ProductGenre = (typeof PRODUCT_GENRES)[number];

export const PRODUCT_COUNTRIES = [
  "Lietuva",
  "Jungtinės Amerikos Valstijos",
  "Vokietija",
  "Lenkija",
  "Japonija",
  "Prancūzija",
  "Jungtinė Karalystė",
  "Ispanija",
] as const;
export type ProductCountry = (typeof PRODUCT_COUNTRIES)[number];

export interface Product {
  id: string;
  coverImage: string;
  name: string;
  regions: ProductRegion[];
  price: number;
  currency: "EUR";
  moneyBackPercent: number;
  platform: ProductPlatform;
  productType: ProductType;
  operatingSystems: ProductOperatingSystem[];
  genres: ProductGenre[];
  country: ProductCountry;
  productKey: string;
  isDemo: true;
  isRecommended: boolean;
  recommendedOrder?: number;
}
