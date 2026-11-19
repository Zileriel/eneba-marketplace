import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  Search,
  ShoppingCart,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router";
import type { User } from "firebase/auth";
import { useCart } from "../../lib/cart/cart-context";
import {
  signOutCurrentUser,
  subscribeToAuthChanges,
} from "../../lib/auth/auth.client";
import { getPopularSearches } from "../../lib/searches/popular-searches.client";
import { useStaleWhileRevalidate } from "../../lib/cache/swr";

export function Header() {
  const { cartButtonRef, itemCount, isCartOpen, openCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const {
    data: searches,
    isLoading,
    error,
    retry: retrySearches,
  } = useStaleWhileRevalidate("popular-searches", getPopularSearches, isOpen);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthChanges(
        (nextUser) => {
          if (isMounted) {
            setUser(nextUser);
            setIsAuthResolved(true);
          }
        },
        (cause) => {
          console.error(
            "Failed to observe Firebase authentication state.",
            cause,
          );
          if (isMounted) setIsAuthResolved(true);
        },
      );
    } catch (cause) {
      console.error("Failed to initialize Firebase authentication.", cause);
      setIsAuthResolved(true);
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (error) {
      console.error("Failed to load popular searches.", error);
    }
  }, [error]);

  useEffect(() => {
    if (isMobileSearchOpen) searchInputRef.current?.focus();
  }, [isMobileSearchOpen]);

  useEffect(() => {
    if (!isProfileOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        profileMenuRef.current?.querySelector("button")?.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isProfileOpen]);

  async function logOut() {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOutCurrentUser();
      setIsProfileOpen(false);
    } catch (cause) {
      console.error("Failed to sign out.", cause);
      setSignOutError("Nepavyko atsijungti. Bandykite dar kartą.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function closeSearch() {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
  }

  function expandMobileSearch() {
    setIsMobileSearchOpen(true);
    openSuggestions();
  }

  function openSuggestions() {
    setIsOpen(true);
  }

  return (
    <header
      className={`site-header${isOpen ? " site-header--search-open" : ""}`}
    >
      {isOpen && (
        <button
          aria-label="Close search suggestions"
          className="search-backdrop"
          onClick={closeSearch}
          type="button"
        />
      )}
      {isProfileOpen && (
        <button
          aria-label="Uždaryti profilį"
          className="account-profile-backdrop"
          onClick={() => setIsProfileOpen(false)}
          type="button"
        />
      )}
      <div className="site-header__inner">
        <a aria-label="Eneba home" className="site-header__brand" href="/">
          <img alt="Eneba" src="/logo.svg" width={222} height={69} />
        </a>

        <div
          className={`header-search${isMobileSearchOpen ? " header-search--mobile-open" : ""}`}
        >
          <button
            aria-expanded={isMobileSearchOpen}
            aria-label="Atidaryti paiešką"
            className="header-search__toggle"
            onClick={expandMobileSearch}
            type="button"
          >
            <Search aria-hidden="true" />
          </button>
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
              ref={searchInputRef}
              role="combobox"
              value={search}
            />
            <button
              aria-label="Uždaryti paiešką"
              className="header-search__close"
              onClick={closeSearch}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </div>

          {isOpen && (
            <div className="popular-searches" id="popular-searches">
              <p className="popular-searches__heading">Populiarios paieškos</p>
              {isLoading ? (
                <p className="popular-searches__message" role="status">
                  Ieškoma populiarių paieškų...
                </p>
              ) : error && searches === undefined ? (
                <div className="popular-searches__message" role="alert">
                  <span>Nepavyko įkelti populiarių paieškų.</span>
                  <button
                    className="popular-searches__retry"
                    onClick={retrySearches}
                    type="button"
                  >
                    Bandykite dar kartą
                  </button>
                </div>
              ) : searches?.length ? (
                <ul>
                  {searches.map(({ id, searchTerm }) => (
                    <li key={id}>
                      <button
                        onClick={() => {
                          setSearch(searchTerm);
                          closeSearch();
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
          <button
            aria-expanded={isCartOpen}
            aria-label={`Atidaryti krepšelį, ${itemCount} prekės`}
            className="header-action header-action--cart"
            onClick={openCart}
            ref={cartButtonRef}
            type="button"
          >
            <ShoppingCart aria-hidden="true" />
            {itemCount > 0 && (
              <span aria-live="polite" className="header-cart-count">
                {itemCount}
              </span>
            )}
          </button>
          <nav aria-label="Account" className="account-actions">
            {!isAuthResolved ? (
              <div
                aria-label="Tikrinama paskyra"
                className="account-actions__loading"
                role="status"
              >
                <span className="account-actions__skeleton-icon" />
                <span className="account-actions__skeleton-label" />
                <span aria-hidden="true" className="account-actions__divider">
                  |
                </span>
                <span className="account-actions__skeleton-label account-actions__skeleton-label--register" />
              </div>
            ) : user ? (
              <div className="account-profile-menu" ref={profileMenuRef}>
                <button
                  aria-controls="account-profile-popover"
                  aria-expanded={isProfileOpen}
                  aria-label="Atidaryti profilį"
                  className="account-profile"
                  onClick={() => {
                    setSignOutError(null);
                    setIsProfileOpen((isOpen) => !isOpen);
                  }}
                  title={user.email ?? "Profilis"}
                  type="button"
                >
                  <img alt="" src="/images/enebian.svg" />
                </button>
                {isProfileOpen && (
                  <section
                    aria-label="Paskyros informacija"
                    className="account-profile-popover"
                    id="account-profile-popover"
                    role="dialog"
                  >
                    <div className="account-profile-popover__identity">
                      <img alt="" src="/images/enebian.svg" />
                      <div>
                        {user.displayName && (
                          <p className="account-profile-popover__name">
                            {user.displayName}
                          </p>
                        )}
                        <p className="account-profile-popover__email">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {signOutError && (
                      <p
                        className="account-profile-popover__error"
                        role="alert"
                      >
                        {signOutError}
                      </p>
                    )}
                    <button
                      className="account-profile-popover__logout"
                      disabled={isSigningOut}
                      onClick={() => void logOut()}
                      type="button"
                    >
                      <LogOut aria-hidden="true" />
                      <span>
                        {isSigningOut ? "Atsijungiama..." : "Atsijungti"}
                      </span>
                    </button>
                  </section>
                )}
              </div>
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
