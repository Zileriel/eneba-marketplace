const CHECKOUT_SESSION_ID_PATTERN = /^cs_test_[a-zA-Z0-9]+$/;

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && CHECKOUT_SESSION_ID_PATTERN.test(value);
}
