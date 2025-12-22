import { useState, type Dispatch, type SetStateAction } from "react";

export type PageInput = {
  userId: string | null;
  setUserId: Dispatch<SetStateAction<string | null>>;
  authChecked: boolean;
  setAuthChecked: Dispatch<SetStateAction<boolean>>;
  isLoggedIn: boolean;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>;
  adminMode: boolean;
};

export function usePageInput(): PageInput {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith("/admin");
  });

  return {
    userId,
    setUserId,
    authChecked,
    setAuthChecked,
    isLoggedIn,
    setIsLoggedIn,
    adminMode,
  };
}
