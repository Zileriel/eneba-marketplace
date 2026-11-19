import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("products", "routes/shop.tsx"),
  route("products/:productId", "routes/product.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("checkout/complete", "routes/checkout-complete.tsx"),
  route("pickup", "routes/pickup.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("lost-password", "routes/lost-password.tsx"),
] satisfies RouteConfig;
