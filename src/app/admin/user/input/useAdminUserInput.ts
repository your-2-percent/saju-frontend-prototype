import { useState } from "react";
import type { Draft } from "../model/types";

export function useAdminUserInput() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [draftByUser, setDraftByUser] = useState<Record<string, Draft>>({});

  const setDraft = (uid: string, patch: Partial<Draft>) => {
    setDraftByUser((prev) => {
      const cur = prev[uid] ?? { plan: "FREE", startDate: "", endDate: "", saving: false };
      return { ...prev, [uid]: { ...cur, ...patch } };
    });
  };

  return {
    search,
    setSearch,
    page,
    setPage,
    draftByUser,
    setDraftByUser,
    setDraft,
  };
}
