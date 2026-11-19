import { useState } from "react";

const banners = [
  {
    collapsed: "/images/banners/banner-1-collapsed.jpg",
    expanded: "/images/banners/banner-1-expanded.jpg",
    label: "GTA VI – Ar jau turi? Pirk GTA VI",
  },
  {
    collapsed: "/images/banners/banner-2-collapsed.jpg",
    expanded: "/images/banners/banner-2-expanded.jpg",
    label: "Mega žaidimo ir žaidimų taškų pasiūlymas",
  },
  {
    collapsed: "/images/banners/banner-3-collapsed.jpg",
    expanded: "/images/banners/banner-3-expanded.jpg",
    label: "Žaidimai iki 90 procentų nuolaidos",
  },
  {
    collapsed: "/images/banners/banner-4-collapsed.jpg",
    expanded: "/images/banners/banner-4-expanded.jpg",
    label: "Programinė įranga pigiau",
  },
];

export function HomeBannerRow() {
  const [expandedBanner, setExpandedBanner] = useState(0);

  return (
    <section aria-label="Pasiūlymai" className="home-banner-row">
      {banners.map((banner, index) => {
        const isExpanded = expandedBanner === index;

        return (
          <button
            aria-label={banner.label}
            aria-pressed={isExpanded}
            className={`home-banner${isExpanded ? " home-banner--expanded" : ""}`}
            key={banner.collapsed}
            onClick={() => setExpandedBanner(index)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="home-banner__image home-banner__image--collapsed"
              style={{ backgroundImage: `url("${banner.collapsed}")` }}
            />
            <span
              aria-hidden="true"
              className="home-banner__image home-banner__image--expanded"
              style={{ backgroundImage: `url("${banner.expanded}")` }}
            />
          </button>
        );
      })}
    </section>
  );
}
