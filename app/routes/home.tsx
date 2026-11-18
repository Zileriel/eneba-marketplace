import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Eneba" },
    { name: "description", content: "Welcome to Eneba!" },
  ];
}

export default function Home() {
  return <h1>Home</h1>;
}
