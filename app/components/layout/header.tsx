import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LogOut,
  Search,
  ShoppingCart,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { User } from "firebase/auth";
import { useCart } from "../../lib/cart/cart-context";
import { getProducts } from "../../lib/products/product-repository.client";
import {
  matchesSearchText,
  searchProducts,
} from "../../lib/products/product-query";
import { formatEuro } from "../../utils/currency";
import {
  signOutCurrentUser,
  subscribeToAuthChanges,
} from "../../lib/auth/auth.client";
import { getPopularSearches } from "../../lib/searches/popular-searches.client";
import { useStaleWhileRevalidate } from "../../lib/cache/swr";

const RECENT_SEARCHES_KEY = "eneba:recent-searches:v1";
const MAX_RECENT_SEARCHES = 5;
const MAX_SEARCH_PRODUCT_SUGGESTIONS = 5;
const SEARCH_CATALOG_CACHE_KEY = "products:header-search:catalog:v1";

export function Header() {
  const { cartButtonRef, itemCount, isCartOpen, openCart } = useCart();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const recentSearchesRef = useRef<string[]>([]);
  const searchQuery = search.trim();
  const shouldSearchProducts = searchQuery.length >= 3;
  const {
    data: searches,
    isLoading,
    error,
    retry: retrySearches,
  } = useStaleWhileRevalidate(
    "popular-searches",
    getPopularSearches,
    isOpen && !shouldSearchProducts,
  );
  const {
    data: searchCatalog,
    isLoading: isLoadingSearchCatalog,
    error: searchCatalogError,
    retry: retrySearchCatalog,
  } = useStaleWhileRevalidate(
    SEARCH_CATALOG_CACHE_KEY,
    getProducts,
    isOpen && shouldSearchProducts,
  );
  const matchingProducts = useMemo(
    () =>
      shouldSearchProducts
        ? searchProducts(searchCatalog ?? [], searchQuery)
        : [],
    [searchCatalog, searchQuery, shouldSearchProducts],
  );
  const matchingRecentSearches = useMemo(
    () =>
      shouldSearchProducts
        ? recentSearches
            .filter((term) => matchesSearchText(term, searchQuery))
            .slice(0, MAX_RECENT_SEARCHES)
        : [],
    [recentSearches, searchQuery, shouldSearchProducts],
  );

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
    const storedSearches = readRecentSearches();
    recentSearchesRef.current = storedSearches;
    setRecentSearches(storedSearches);
  }, []);

  useEffect(() => {
    if (searchCatalogError) {
      console.error("Failed to load products for header search.", searchCatalogError);
    }
  }, [searchCatalogError]);

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

  function rememberSearch(searchTerm: string) {
    const updatedSearches = addRecentSearch(searchTerm, recentSearchesRef.current);
    recentSearchesRef.current = updatedSearches;
    setRecentSearches(updatedSearches);
  }

  function navigateToSearchResults(searchTerm: string) {
    const query = searchTerm.trim();
    if (!query) return;

    rememberSearch(query);
    closeSearch();
    navigate(`/products?${new URLSearchParams({ q: query })}`);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToSearchResults(search);
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
          <form
            className="header-search__field"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <Search aria-hidden="true" className="header-search__icon" />
            <input
              aria-expanded={isOpen}
              aria-label="Search games and top-ups"
              aria-controls="search-suggestions"
              aria-autocomplete="list"
              autoComplete="off"
              onChange={(event) => setSearch(event.currentTarget.value)}
              onFocus={openSuggestions}
              placeholder="Ieškoti žaidimų, papildymų ir daugiau"
              ref={searchInputRef}
              role="combobox"
              value={search}
            />
            <button
              aria-label={
                isMobileSearchOpen ? "Uždaryti paiešką" : "Išvalyti paiešką"
              }
              className={`header-search__close${search && !isMobileSearchOpen ? " header-search__close--desktop-visible" : ""}`}
              onClick={() => {
                if (isMobileSearchOpen) {
                  closeSearch();
                } else {
                  setSearch("");
                  searchInputRef.current?.focus();
                }
              }}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </form>

          {isOpen && (
            <div className="popular-searches" id="search-suggestions">
              {!shouldSearchProducts ? (
                <>
                  <p className="popular-searches__heading">
                    Populiarios paieškos
                  </p>
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
                            onClick={() => setSearch(searchTerm)}
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
                        Populiarių paieškų dar nėra.
                      </p>
                    )
                  )}
                </>
              ) : (
                <>
                  {matchingRecentSearches.length > 0 && (
                    <section className="search-suggestions__section">
                      <p className="popular-searches__heading">
                        Neseniai ieškojote
                      </p>
                      <ul>
                        {matchingRecentSearches.map((searchTerm) => (
                          <li key={searchTerm}>
                            <button
                              onClick={() => setSearch(searchTerm)}
                              type="button"
                            >
                              <Search aria-hidden="true" />
                              <span>{searchTerm}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section className="search-suggestions__section">
                    <p className="popular-searches__heading">Produktai</p>
                    {isLoadingSearchCatalog && searchCatalog === undefined ? (
                      <p className="popular-searches__message" role="status">
                        Ieškoma produktų...
                      </p>
                    ) : searchCatalogError && searchCatalog === undefined ? (
                      <div className="popular-searches__message" role="alert">
                        <span>Nepavyko ieškoti produktų.</span>
                        <button
                          className="popular-searches__retry"
                          onClick={retrySearchCatalog}
                          type="button"
                        >
                          Bandykite dar kartą
                        </button>
                      </div>
                    ) : matchingProducts.length > 0 ? (
                      <ul className="search-suggestions__products">
                        {matchingProducts
                          .slice(0, MAX_SEARCH_PRODUCT_SUGGESTIONS)
                          .map((product) => (
                            <li key={product.id}>
                              <Link
                                aria-label={`Peržiūrėti produktą: ${product.name}`}
                                className="search-product-result"
                                onClick={() => {
                                  rememberSearch(searchQuery);
                                  closeSearch();
                                }}
                                to={`/products/${encodeURIComponent(product.id)}`}
                              >
                                <img
                                  alt=""
                                  className="search-product-result__cover"
                                  loading="lazy"
                                  src={product.coverImage}
                                />
                                <span className="search-product-result__details">
                                  <span className="search-product-result__type">
                                    {product.productType}
                                  </span>
                                  <span className="search-product-result__name">
                                    {product.name}
                                  </span>
                                </span>
                                <span className="search-product-result__price">
                                  {formatEuro(product.price)}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="popular-searches__message">
                        Produktų pagal paiešką nerasta.
                      </p>
                    )}
                    {matchingProducts.length > 0 && (
                      <button
                        className="search-suggestions__view-all"
                        onClick={() => navigateToSearchResults(searchQuery)}
                        type="button"
                      >
                        {getSearchResultsLabel(matchingProducts.length)}
                      </button>
                    )}
                  </section>
                </>
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

function readRecentSearches() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error("Stored recent searches are not a list.");
    }

    return [...new Set(
      parsed
        .filter(
          (term): term is string =>
            typeof term === "string" && term.trim().length > 0,
        )
        .map((term) => term.trim()),
    )].slice(0, MAX_RECENT_SEARCHES);
  } catch (cause) {
    console.error("Failed to load recent searches.", cause);
    return [];
  }
}

function addRecentSearch(searchTerm: string, recentSearches: string[]) {
  const query = searchTerm.trim();
  if (!query) return recentSearches;

  const updatedSearches = [
    query,
    ...recentSearches.filter(
      (term) => term.toLocaleLowerCase("lt-LT") !== query.toLocaleLowerCase("lt-LT"),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(updatedSearches),
    );
  } catch (cause) {
    console.error("Failed to save recent search.", cause);
  }

  return updatedSearches;
}

function getSearchResultsLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const noun =
    lastDigit === 1 && lastTwoDigits !== 11
      ? "rezultatą"
      : lastDigit >= 2 &&
          lastDigit <= 9 &&
          (lastTwoDigits < 12 || lastTwoDigits > 19)
        ? "rezultatus"
        : "rezultatų";

  return `Rodyti visus ${count} ${noun}`;
}
