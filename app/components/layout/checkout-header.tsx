import { Link } from "react-router";

export function CheckoutHeader({
  activeStep,
}: {
  activeStep: "cart" | "payment";
}) {
  return (
    <header className="checkout-header">
      <Link
        aria-label="Eneba pradžia"
        className="checkout-header__brand"
        to="/"
      >
        <img alt="Eneba" src="/logo.svg" />
      </Link>
      <ol aria-label="Apmokėjimo eiga" className="checkout-steps">
        <li
          aria-current={activeStep === "cart" ? "step" : undefined}
          className={
            activeStep === "cart"
              ? "checkout-steps__active"
              : "checkout-steps__complete"
          }
        >
          1 <span>Krepšelis</span>
        </li>
        <li
          aria-current={activeStep === "payment" ? "step" : undefined}
          className={activeStep === "payment" ? "checkout-steps__active" : ""}
        >
          2 <span>Mokėjimas</span>
        </li>
        <li>
          3 <span>Atsiimti prekę</span>
        </li>
      </ol>
    </header>
  );
}
