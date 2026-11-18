import { useEffect, useState } from "react";
import { Search, ShoppingCart, TrendingUp, UserRound } from "lucide-react";
import { Link } from "react-router";
import type { User } from "firebase/auth";
import { subscribeToAuthChanges } from "../lib/auth/auth.client";
import { getPopularSearches } from "../lib/searches/popular-searches.client";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searches, setSearches] = useState<Awaited<
    ReturnType<typeof getPopularSearches>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthChanges(
        (nextUser) => {
          if (isMounted) setUser(nextUser);
        },
        (cause) => {
          console.error(
            "Failed to observe Firebase authentication state.",
            cause,
          );
        },
      );
    } catch (cause) {
      console.error("Failed to initialize Firebase authentication.", cause);
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  function openSuggestions() {
    setIsOpen(true);
    if (searches || isLoading) return;

    setIsLoading(true);
    setError(null);
    getPopularSearches()
      .then(setSearches)
      .catch((cause: unknown) => {
        console.error("Failed to load popular searches.", cause);
        setError("Popular searches could not be loaded.");
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <header
      className={`site-header${isOpen ? " site-header--search-open" : ""}`}
    >
      {isOpen && (
        <button
          aria-label="Close search suggestions"
          className="search-backdrop"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      )}
      <div className="site-header__inner">
        <a aria-label="Eneba home" className="site-header__brand" href="/">
          <img alt="Eneba" src="/logo.svg" width={222} height={69} />
        </a>

        <div className="header-search">
          <div className="header-search__field">
            <Search aria-hidden="true" className="header-search__icon" />
            <input
              aria-expanded={isOpen}
              aria-label="Search games and top-ups"
              aria-controls="popular-searches"
              autoComplete="off"
              onChange={(event) => setSearch(event.currentTarget.value)}
              onFocus={openSuggestions}
              placeholder="Ieškoti žaidimų, papildymų ir daugiau"
              role="combobox"
              value={search}
            />
          </div>

          {isOpen && (
            <div className="popular-searches" id="popular-searches">
              <p className="popular-searches__heading">Populiarios paieškos</p>
              {isLoading ? (
                <p className="popular-searches__message" role="status">
                  Loading popular searches…
                </p>
              ) : error ? (
                <div className="popular-searches__message" role="alert">
                  <span>{error}</span>
                  <button
                    className="popular-searches__retry"
                    onClick={openSuggestions}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : searches?.length ? (
                <ul>
                  {searches.map(({ id, searchTerm }) => (
                    <li key={id}>
                      <button
                        onClick={() => {
                          setSearch(searchTerm);
                          setIsOpen(false);
                        }}
                        type="button"
                      >
                        <TrendingUp aria-hidden="true" />
                        <span>{searchTerm}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !isLoading && (
                  <p className="popular-searches__message">
                    No popular searches available.
                  </p>
                )
              )}
            </div>
          )}
        </div>

        <div className="site-header__actions">
          <button className="header-action header-action--cart" type="button">
            <ShoppingCart aria-hidden="true" />
          </button>
          <nav aria-label="Account" className="account-actions">
            {user ? (
              <span
                aria-label={`Profilis: ${user.email ?? ""}`}
                className="account-profile"
                title={user.email ?? "Profilis"}
              >
                <UserRound aria-hidden="true" />
                <span>{user.displayName || user.email || "Profilis"}</span>
              </span>
            ) : (
              <>
                <Link className="header-action" to="/login">
                  <UserRound aria-hidden="true" />
                  <span>Prisijungti</span>
                </Link>
                <span aria-hidden="true" className="account-actions__divider">
                  |
                </span>
                <Link className="header-action" to="/register">
                  <span>Registruotis</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
