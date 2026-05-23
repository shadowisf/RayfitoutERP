"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type RefreshContextValue = {
  refresh: () => Promise<void>;
  isPending: boolean;
};

const RefreshContext = createContext<RefreshContextValue>({
  refresh: () => Promise.resolve(),
  isPending: false,
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const resolversRef = useRef<Array<() => void>>([]);

  // When transition completes, resolve all waiting promises
  useEffect(() => {
    if (!isPending && resolversRef.current.length > 0) {
      resolversRef.current.forEach((resolve) => resolve());
      resolversRef.current = [];
    }
  }, [isPending]);

  const refresh = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      resolversRef.current.push(resolve);
      startTransition(() => router.refresh());
    });
  }, [router]);

  return (
    <RefreshContext.Provider value={{ refresh, isPending }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
