const lithuanianEuroFormatter = new Intl.NumberFormat("lt-LT", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(amount: number) {
  return lithuanianEuroFormatter.format(amount);
}
