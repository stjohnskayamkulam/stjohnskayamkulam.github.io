/**
 * Firebase initialisation.
 *
 * Initialised lazily so that mock mode never pays the cost of loading or
 * connecting the SDK. Everything here is safe to import unconditionally.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "@/config/env";

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env.local and fill in the VITE_FIREBASE_* values.",
    );
  }
  if (!services) {
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId!,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId!,
    });
    services = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }
  return services;
}

export { isFirebaseConfigured };
