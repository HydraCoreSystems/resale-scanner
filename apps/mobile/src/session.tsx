import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setSignedOutHandler, setToken, type DataSource, type Entitlement } from "./api";

const TOKEN_KEY = "session-token";

interface Session {
  ready: boolean;
  signedIn: boolean;
  entitlement: Entitlement | null;
  dataSources: Record<string, DataSource> | null;
  signIn: (identityToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setEntitlement: (e: Entitlement) => void;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [dataSources, setDataSources] = useState<Record<string, DataSource> | null>(null);

  const signOut = useCallback(async () => {
    setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setSignedIn(false);
    setEntitlement(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await api.me();
    setEntitlement(me.entitlement);
    setDataSources(me.dataSources);
  }, []);

  useEffect(() => {
    setSignedOutHandler(() => {
      void signOut();
    });
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          await refresh();
          setSignedIn(true);
        }
      } catch {
        // No signal or an old token. Show the sign in screen.
      } finally {
        setReady(true);
      }
    })();
  }, [refresh, signOut]);

  const signIn = useCallback(async (identityToken: string) => {
    const r = await api.signIn(identityToken);
    setToken(r.token);
    await SecureStore.setItemAsync(TOKEN_KEY, r.token);
    setEntitlement(r.entitlement);
    setDataSources(r.dataSources);
    setSignedIn(true);
  }, []);

  const value = useMemo(
    () => ({ ready, signedIn, entitlement, dataSources, signIn, signOut, refresh, setEntitlement }),
    [ready, signedIn, entitlement, dataSources, signIn, signOut, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error("SessionProvider missing");
  return v;
}
