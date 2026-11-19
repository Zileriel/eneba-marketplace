import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthChanges } from "./auth.client";

type AuthUserState =
  | { status: "loading"; user: null; error: null }
  | { status: "authenticated"; user: User; error: null }
  | { status: "unauthenticated"; user: null; error: null }
  | { status: "error"; user: null; error: Error };

export function useAuthUser() {
  const [state, setState] = useState<AuthUserState>({
    status: "loading",
    user: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthChanges(
        (user) => {
          if (!isMounted) return;
          setState(
            user
              ? { status: "authenticated", user, error: null }
              : { status: "unauthenticated", user: null, error: null },
          );
        },
        (error) => {
          console.error("Failed to observe Firebase authentication state.", error);
          if (isMounted) setState({ status: "error", user: null, error });
        },
      );
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause
          : new Error("Failed to initialize Firebase authentication.", {
              cause,
            });
      console.error("Failed to initialize Firebase authentication.", error);
      setState({ status: "error", user: null, error });
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}
