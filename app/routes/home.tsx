import type { Route } from "./+types/home";
import { Header } from "../components/header";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Eneba" },
    { name: "description", content: "Welcome to Eneba!" },
  ];
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="home-content">
        <h1>Home</h1>
      </main>
    </>
  );
}
