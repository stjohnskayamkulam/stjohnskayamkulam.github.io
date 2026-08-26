/**
 * Environment plumbing.
 *
 * The app has two interchangeable data backends:
 *  - `mock`     — empty in-memory store, no network, no credentials
 *  - `firebase` — Firebase Auth + Firestore
 *
 * Firebase is used automatically as soon as a project config is present, which
 * means `npm run dev` works on a fresh clone with zero setup.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Force mock mode even when Firebase credentials exist (handy for demos/CI). */
const forceMock = env.VITE_USE_MOCK_DATA === "true";

export const isFirebaseConfigured: boolean =
  !forceMock &&
  Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
  );

export type DataBackend = "mock" | "firebase";

export const dataBackend: DataBackend = isFirebaseConfigured
  ? "firebase"
  : "mock";

/** `hash` avoids any server-side rewrite requirements; see README. */
export const routerMode: "browser" | "hash" =
  env.VITE_ROUTER_MODE === "hash" ? "hash" : "browser";

export const analyticsDebug = env.VITE_ANALYTICS_DEBUG === "true" || env.DEV;

export const baseUrl: string = env.BASE_URL;
