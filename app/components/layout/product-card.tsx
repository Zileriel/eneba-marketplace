import { CirclePlus, Gamepad2, Info, ShoppingCart } from "lucide-react";
import type { Product } from "../../lib/products/products";

const formatEuro = new Intl.NumberFormat("lt-LT", {
  style: "currency",
  currency: "EUR",
});

export function ProductCard({
  product,
  carousel = false,
}: {
  product: Product;
  carousel?: boolean;
}) {
  const moneyBack = (product.price * product.moneyBackPercent) / 100;
  const region = product.regions[0];
  const regionStyle =
    region === "Europa" ? "europe" : region === "JAV" ? "usa" : "global";
  const platformLabel =
    product.platform === "PlayStation Network" ? "PSN" : product.platform;

  return (
    <article
      className={`product-card${carousel ? " product-card--carousel" : ""}`}
    >
      <div className="product-card__cover">
        <img alt={product.name} src={product.coverImage} />
        <span className="product-card__cashback-badge">
          <CirclePlus aria-hidden="true" />
          <span>GRĮŽTA</span>
        </span>
        <div className="product-card__platform">
          <Gamepad2 aria-hidden="true" />
          <span>{platformLabel}</span>
        </div>
      </div>
      <div className="product-card__body">
        <div className="product-card__details">
          <h3>{product.name}</h3>
          <div className="product-card__metadata">
            <p
              className={`product-card__region product-card__region--${regionStyle}`}
            >
              {region.toLocaleUpperCase("lt-LT")}
            </p>
            <p className="product-card__from">Nuo</p>
            <p className="product-card__price">
              {formatEuro.format(product.price)}
              <Info aria-hidden="true" />
            </p>
            <p className="product-card__money-back">
              grįžta: {formatEuro.format(moneyBack)}
            </p>
          </div>
        </div>
        <button
          aria-label="Pridėti į krepšelį"
          className="product-card__add-button"
          type="button"
        >
          <ShoppingCart aria-hidden="true" />
          <span className="product-card__add-label">Pridėti į krepšelį</span>
        </button>
      </div>
    </article>
  );
}
