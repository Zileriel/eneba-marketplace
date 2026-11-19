import { useCallback, useEffect, useState } from "react";

const CACHE_STORAGE_PREFIX = "eneba:swr:v1:";

type CacheListener<T> = (value: T) => void;
type ResourceState<T> = {
  key: string;
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
};

const cache = new Map<string, unknown>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<CacheListener<unknown>>>();

export function getCachedValue<T>(key: string): T | undefined {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(`${CACHE_STORAGE_PREFIX}${key}`);
    if (!stored) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("value" in parsed)
    ) {
      window.localStorage.removeItem(`${CACHE_STORAGE_PREFIX}${key}`);
      return undefined;
    }

    cache.set(key, parsed.value);
    return parsed.value as T;
  } catch (cause) {
    console.warn(`Could not read cached data for "${key}".`, cause);
    return undefined;
  }
}

export function subscribeToCachedValue<T>(
  key: string,
  listener: CacheListener<T>,
) {
  let resourceListeners = listeners.get(key);
  if (!resourceListeners) {
    resourceListeners = new Set();
    listeners.set(key, resourceListeners);
  }
  resourceListeners.add(listener as CacheListener<unknown>);

  return () => {
    resourceListeners?.delete(listener as CacheListener<unknown>);
    if (resourceListeners?.size === 0) {
      listeners.delete(key);
    }
  };
}

export function revalidateCachedValue<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const pendingRequest = inFlightRequests.get(key);
  if (pendingRequest) {
    return pendingRequest as Promise<T>;
  }

  const request = fetcher().then((value) => {
    cache.set(key, value);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `${CACHE_STORAGE_PREFIX}${key}`,
          JSON.stringify({ value }),
        );
      } catch (cause) {
        console.warn(`Could not persist cached data for "${key}".`, cause);
      }
    }

    listeners.get(key)?.forEach((listener) => listener(value));
    return value;
  });

  inFlightRequests.set(key, request);
  void request.then(
    () => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    },
    () => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    },
  );
  return request;
}

export function useCachedValue<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const cachedValue = getCachedValue<T>(key);
    return cachedValue === undefined ? fallback : cachedValue;
  });

  useEffect(() => {
    const unsubscribe = subscribeToCachedValue<T>(key, setValue);
    const cachedValue = getCachedValue<T>(key);
    if (cachedValue !== undefined) {
      setValue(cachedValue);
    }

    return unsubscribe;
  }, [key]);

  return value;
}

export function useStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  enabled = true,
) {
  const [state, setState] = useState<ResourceState<T>>(() => {
    return { key, data: undefined, error: null, isLoading: true };
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCurrent = true;
    const cachedData = getCachedValue<T>(key);
    const unsubscribe = subscribeToCachedValue<T>(key, (data) => {
      if (isCurrent) {
        setState({ key, data, error: null, isLoading: false });
      }
    });

    if (cachedData !== undefined) {
      setState({ key, data: cachedData, error: null, isLoading: false });
    } else {
      setState((current) => ({
        key,
        data: current.key === key ? current.data : undefined,
        error: null,
        isLoading: true,
      }));
    }

    revalidateCachedValue(key, fetcher).catch((error: unknown) => {
      if (isCurrent) {
        setState((current) => ({
          key,
          data: current.key === key ? current.data : undefined,
          error,
          isLoading: false,
        }));
      }
    });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [enabled, fetcher, key, retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  return state.key === key
    ? { ...state, retry }
    : { data: undefined, error: null, isLoading: enabled, retry };
}
