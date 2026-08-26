import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authService from "@/services/authService";
import { updateProfile } from "@/services/alumniService";
import type { Session } from "@/services/providers/types";
import type { AlumniProfile } from "@/types";
import { isStaffAccount } from "@/config/admins";
import { isSessionVerified } from "@/services/membershipService";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribeToSession((next) => {
      setSession(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSession(await authService.signInWithGoogle());
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    setSession(await authService.refreshSession());
  }, []);

  const saveProfile = useCallback(
    async (patch: Partial<AlumniProfile>) => {
      if (!session) throw new Error("Not signed in");
      const profile = await updateProfile(session.account.uid, patch);
      setSession({ ...session, profile });
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: Boolean(session),
      isVerified: isSessionVerified(session),
      isAdmin: Boolean(session && isStaffAccount(session.account)),
      signInWithGoogle,
      signOut,
      refresh,
      saveProfile,
    }),
    [
      session,
      loading,
      signInWithGoogle,
      signOut,
      refresh,
      saveProfile,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
