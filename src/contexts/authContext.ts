import { createContext } from "react";
import type { AlumniProfile } from "@/types";
import type { RegistrationInput, Session } from "@/services/providers/types";

export interface AuthContextValue {
  session: Session | null;
  /** True until the first auth state resolution completes. */
  loading: boolean;
  isAuthenticated: boolean;
  /** Signed in *and* approved by an administrator. */
  isVerified: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Updates the signed-in user's own profile and syncs the session copy. */
  saveProfile: (patch: Partial<AlumniProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
