import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

export function subscribeToAuthChanges(
  onUser: (user: User | null) => void,
  onError: (error: Error) => void,
) {
  return onAuthStateChanged(auth, onUser, onError);
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function getAuthErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;

  if (typeof code !== "string") {
    return "Įvyko nenumatyta klaida. Bandykite dar kartą.";
  }

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Šis el. pašto adresas jau užregistruotas.",
    "auth/invalid-credential": "Neteisingas el. paštas arba slaptažodis.",
    "auth/invalid-email": "Įveskite galiojantį el. pašto adresą.",
    "auth/network-request-failed":
      "Nepavyko prisijungti prie tinklo. Patikrinkite ryšį ir bandykite dar kartą.",
    "auth/operation-not-allowed":
      "El. pašto ir slaptažodžio prisijungimas šiuo metu neįjungtas.",
    "auth/password-does-not-meet-requirements":
      "Slaptažodis neatitinka saugumo reikalavimų.",
    "auth/too-many-requests":
      "Per daug bandymų. Palaukite ir bandykite dar kartą.",
    "auth/user-disabled": "Ši paskyra išjungta.",
    "auth/user-not-found": "Paskyra su šiuo el. pašto adresu nerasta.",
    "auth/weak-password": "Slaptažodį turi sudaryti bent 6 simboliai.",
    "auth/wrong-password": "Neteisingas el. paštas arba slaptažodis.",
  };

  return messages[code] ?? "Nepavyko atlikti veiksmo. Bandykite dar kartą.";
}
