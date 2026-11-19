import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthShell } from "../components/layout/auth-shell";
import { PasswordField } from "../components/input/password-field";
import {
  getAuthErrorMessage,
  registerWithEmail,
} from "../lib/auth/auth.client";
import { authPageUrl, getSafeRedirectTo } from "../lib/auth/redirect";
import type { Route } from "./+types/register";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Registruotis | Eneba" }];
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirectTo(searchParams.get("redirectTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantsOffers, setWantsOffers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await registerWithEmail(email.trim(), password);
      await navigate(redirectTo);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <section aria-labelledby="auth-title" className="auth-card">
        <h2 id="auth-title">Registruotis</h2>
        <p className="auth-card__subtitle">
          Jau turite paskyrą?{" "}
          <Link className="auth-link" to={authPageUrl("/login", redirectTo)}>
            Prisijunkite
          </Link>
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
          <PasswordField
            autoComplete="new-password"
            disabled={isSubmitting}
            onChange={setPassword}
            value={password}
          />
          <label className="auth-checkbox">
            <input
              checked={wantsOffers}
              disabled={isSubmitting}
              onChange={(event) => setWantsOffers(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>Noriu gauti pasiulymus</span>
          </label>
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
            {isSubmitting ? "Kuriama paskyra..." : "Registruotis"}
          </button>
        </form>
        <p className="auth-card__legal">
          Sukurdamas paskyrą patvirtinu, kad man yra bent 16-ka metų ir sutinku
          su Eneba{" "}
          <a
            className="auth-link"
            href="https://www.eneba.com/lt/terms-and-conditions"
            rel="noreferrer"
            target="_blank"
          >
            Taisyklėmis ir Sąlygomis
          </a>{" "}
          bei{" "}
          <a
            className="auth-link"
            href="https://www.eneba.com/lt/privacy-policy"
            rel="noreferrer"
            target="_blank"
          >
            Privatumo Pranešimu.
          </a>
        </p>
      </section>
    </AuthShell>
  );
}
