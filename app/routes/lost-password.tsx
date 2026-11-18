import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AuthShell } from "../components/layout/auth-shell";
import {
  getAuthErrorMessage,
  sendPasswordReset,
} from "../lib/auth/auth.client";
import type { Route } from "./+types/lost-password";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Pamiršote slaptažodį? | Eneba" }];
}

export default function LostPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setIsSent(false);

    try {
      await sendPasswordReset(email.trim());
      setIsSent(true);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <section aria-labelledby="auth-title" className="auth-card">
        <h2 id="auth-title">Pamiršote slaptažodį?</h2>
        <p className="auth-card__subtitle">
          El. paštu gausi laišką su nuoroda, leidžiančia nustatyti naują
          slaptažodį
        </p>
        <form
          aria-busy={isSubmitting}
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <input
            autoComplete="email"
            disabled={isSubmitting}
            id="username"
            name="username"
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="El. paštas"
            required
            type="email"
            value={email}
          />
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          {isSent && (
            <p className="auth-form__success" role="status">
              Jei paskyra susieta su šiuo el. paštu, netrukus gausite
              slaptažodžio nustatymo nuorodą.
            </p>
          )}
          <button
            className="auth-form__submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Siunčiama..." : "Patvirtinti"}
          </button>
        </form>
        <p className="auth-card__footer">
          <Link className="auth-link" to="/login">
            Grįžti į prisijungimą
          </Link>
        </p>
      </section>
    </AuthShell>
  );
}
