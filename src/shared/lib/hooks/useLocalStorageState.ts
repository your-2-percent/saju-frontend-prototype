// hooks/useLocalStorageState.ts
import { useEffect, useState } from "react";

export function useLocalStorageState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  // 1) 클라이언트에서 한번만 읽기
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(key);
      if (raw != null) {
        setState(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, [key]);

  // 2) 읽기 후에만 쓰기
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, state, loaded]);

  return [state, setState, loaded];
}
