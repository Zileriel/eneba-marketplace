import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthShell } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";
import { getAuthErrorMessage, signInWithEmail } from "../lib/auth/auth.client";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Prisijungti | Eneba" }];
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(email.trim(), password);
      await navigate("/");
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <section aria-labelledby="auth-title" className="auth-card">
        <h2 id="auth-title">Prisijungti</h2>
        <p className="auth-card__subtitle">
          Naujas vartotojas?{" "}
          <Link className="auth-link" to="/register">
            Susikurk paskyrą
          </Link>
        </p>
        <form
          aria-busy={isSubmitting}
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <input
            autoComplete="username"
            disabled={isSubmitting}
            id="username"
            name="username"
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="El. paštas"
            required
            type="email"
            value={email}
          />
          <PasswordField
            autoComplete="current-password"
            disabled={isSubmitting}
            onChange={setPassword}
            value={password}
          />
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button
            className="auth-form__submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Jungiama..." : "Prisijungti"}
          </button>
        </form>
        <p className="auth-card__footer">
          <Link className="auth-link" to="/lost-password">
            Pamiršote slaptažodį?
          </Link>
        </p>
      </section>
    </AuthShell>
  );
}
