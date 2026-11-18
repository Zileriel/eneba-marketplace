import type { ReactNode } from "react";
import { Link } from "react-router";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <Link aria-label="Eneba home" to="/">
          <img alt="Eneba" src="/logo.svg" />
        </Link>
      </header>
      <main className="auth-layout">
        <h1 className="auth-layout__welcome">
          Sveiki!
          <br />
          Malonu jus matyti!
        </h1>
        {children}
      </main>
    </div>
  );
}
