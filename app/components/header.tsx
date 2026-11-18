import { useState } from "react";
import { Search, ShoppingCart, TrendingUp, UserRound } from "lucide-react";
import { getPopularSearches } from "../lib/popular-searches.client";

export function Header() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searches, setSearches] = useState<Awaited<
    ReturnType<typeof getPopularSearches>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <img alt="Eneba" src="/logo.svg" />
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
            <button className="header-action" type="button">
              <UserRound aria-hidden="true" />
              <span>Prisijungti</span>
            </button>
            <span aria-hidden="true" className="account-actions__divider">
              |
            </span>
            <button className="header-action" type="button">
              <span>Registruotis</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
