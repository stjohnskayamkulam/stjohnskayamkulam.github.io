/**
 * Backend selection.
 *
 * Providers are loaded dynamically so a mock-mode deployment never ships the
 * Firebase SDK, and vice versa. Every service method is already async, so the
 * extra await costs nothing at the call sites.
 */
import { dataBackend } from "@/config/env";
import type { AuthProvider, DataProvider } from "./providers/types";

let dataPromise: Promise<DataProvider> | null = null;
let authPromise: Promise<AuthProvider> | null = null;

export function getDataProvider(): Promise<DataProvider> {
  dataPromise ??=
    dataBackend === "firebase"
      ? import("./providers/firestoreProvider").then(
          (m) => m.firestoreDataProvider,
        )
      : import("./providers/mockProvider").then((m) => m.mockDataProvider);
  return dataPromise;
}

export function getAuthProvider(): Promise<AuthProvider> {
  authPromise ??=
    dataBackend === "firebase"
      ? import("./providers/firestoreProvider").then(
          (m) => m.firestoreAuthProvider,
        )
      : import("./providers/mockProvider").then((m) => m.mockAuthProvider);
  return authPromise;
}

export type {
  AuthProvider,
  DataProvider,
  Session,
} from "./providers/types";
