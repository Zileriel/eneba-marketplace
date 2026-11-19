import { redirect } from "react-router";
import type { Route } from "./+types/checkout-complete";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Prekių atsiėmimas | Eneba" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const search = new URL(request.url).search;
  return redirect(`/pickup${search}`);
}

export default function CheckoutComplete() {
  return null;
}
