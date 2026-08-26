/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_ROUTER_MODE?: "browser" | "hash";
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_ANALYTICS_DEBUG?: string;

  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;

  readonly VITE_SCHOOL_NAME?: string;
  readonly VITE_SCHOOL_SHORT_NAME?: string;
  readonly VITE_SCHOOL_LOGO?: string;
  readonly VITE_SCHOOL_PRIMARY_COLOR?: string;
  readonly VITE_SCHOOL_SECONDARY_COLOR?: string;
  readonly VITE_SCHOOL_ACCENT_COLOR?: string;
  readonly VITE_SCHOOL_FOUNDED_YEAR?: string;
  readonly VITE_SCHOOL_LOCATION?: string;
  readonly VITE_SCHOOL_TAGLINE?: string;
  readonly VITE_SCHOOL_CONTACT_EMAIL?: string;
  readonly VITE_SCHOOL_CONTACT_PHONE?: string;
  readonly VITE_SCHOOL_FACEBOOK_URL?: string;
  readonly VITE_SCHOOL_HERO_IMAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
