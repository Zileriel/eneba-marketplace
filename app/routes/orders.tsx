import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/orders";
import { Header } from "../components/layout/header";
import { authPageUrl } from "../lib/auth/redirect";
import { useAuthUser } from "../lib/auth/use-auth-user";
import {
  getOrderHistory,
  type OrderHistoryEntry,
} from "../lib/orders/order-history.client";
import { formatEuro } from "../utils/currency";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet: "„Eneba“ piniginė",
  card: "Banko kortelė",
  paypal: "PayPal",
  swedbank: "Swedbank",
  seb: "SEB",
  luminor: "Luminor",
  revolut: "Revolut",
  artea: "Šiaulių bankas",
};

const ORDER_DATE_FORMAT = new Intl.DateTimeFormat("lt-LT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function meta({}: Route.MetaArgs) {
  return [{ title: "Užsakymų istorija | Eneba" }];
}

export default function OrdersPage() {
  const authState = useAuthUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistoryEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const userId =
    authState.status === "authenticated" ? authState.user.uid : null;

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      void navigate(authPageUrl("/login", "/orders"), { replace: true });
    }
  }, [authState.status, navigate]);

  useEffect(() => {
    if (!userId) return;

    let isCurrent = true;
    setOrders(null);
    setLoadError(false);
    getOrderHistory(userId)
      .then((result) => {
        if (isCurrent) setOrders(result);
      })
      .catch((cause: unknown) => {
        console.error("Could not load the user's order history.", cause);
        if (isCurrent) setLoadError(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [retryCount, userId]);

  return (
    <>
      <Header />
      <main className="orders-page">
        <div className="orders-page__content">
          {authState.status !== "unauthenticated" && (
            <header className="orders-page__heading">
              <h1>Užsakymų istorija</h1>
              {authState.status === "authenticated" && authState.user.email && (
                <p>{authState.user.email}</p>
              )}
            </header>
          )}

          {authState.status === "loading" && (
            <p className="orders-page__message" role="status">
              Tikrinama paskyra...
            </p>
          )}
          {authState.status === "error" && (
            <p
              className="orders-page__message orders-page__message--error"
              role="alert"
            >
              Nepavyko patikrinti paskyros. Atnaujinkite puslapį ir bandykite
              dar kartą.
            </p>
          )}
          {authState.status === "unauthenticated" && (
            <p className="orders-page__message" role="status">
              Peradresuojama į prisijungimo puslapį...
            </p>
          )}
          {authState.status === "authenticated" &&
            orders === null &&
            !loadError && (
              <p className="orders-page__message" role="status">
                Įkeliama užsakymų istorija...
              </p>
            )}
          {authState.status === "authenticated" && loadError && (
            <div
              className="orders-page__message orders-page__message--error"
              role="alert"
            >
              <p>Nepavyko įkelti užsakymų istorijos.</p>
              <button
                onClick={() => setRetryCount((count) => count + 1)}
                type="button"
              >
                Bandykite dar kartą
              </button>
            </div>
          )}
          {authState.status === "authenticated" &&
            orders !== null &&
            (orders.length > 0 ? (
              <ul aria-label="Užsakymai" className="orders-page__list">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </ul>
            ) : (
              <section className="orders-page__empty">
                <h2>Užsakymų dar nėra</h2>
                <p>Čia matysite savo įsigytų skaitmeninių prekių istoriją.</p>
                <Link
                  className="cart-button cart-button--primary"
                  to="/products"
                >
                  Naršyti prekes
                </Link>
              </section>
            ))}
        </div>
      </main>
    </>
  );
}

function OrderCard({ order }: { order: OrderHistoryEntry }) {
  const paymentMethod = order.selectedPaymentMethod
    ? PAYMENT_METHOD_LABELS[order.selectedPaymentMethod] ??
      order.selectedPaymentMethod
    : null;

  return (
    <li>
      <article
        aria-label={`Užsakymas, ${ORDER_DATE_FORMAT.format(
          new Date(order.createdAt),
        )}`}
        className="orders-page__order"
      >
        <header className="orders-page__order-header">
          <time dateTime={new Date(order.createdAt).toISOString()}>
            {ORDER_DATE_FORMAT.format(new Date(order.createdAt))}
          </time>
          <span className="orders-page__order-status">Apmokėta</span>
        </header>
        {paymentMethod && (
          <p className="orders-page__payment">
            Mokėjimo būdas: <strong>{paymentMethod}</strong>
          </p>
        )}
        <ul className="orders-page__items">
          {order.items.map((item) => (
            <li key={item.productId}>
              <span>{item.name}</span>
              <span>× {item.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="orders-page__total">
          <span>Iš viso</span>
          <strong>{formatEuro(order.amountTotal / 100)}</strong>
        </p>
      </article>
    </li>
  );
}
