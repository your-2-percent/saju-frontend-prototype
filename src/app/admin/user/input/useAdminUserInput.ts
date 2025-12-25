// src/app/admin/user/list/input/useAdminUserInput.ts
import { useState } from "react";
import type { Draft } from "../model/types";

export type AdminUserTab = "ACTIVE" | "DISABLED" | "ALL";

export type AdminUserSort =
  | "LAST_SEEN_DESC"
  | "LAST_SEEN_ASC"
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "PLAN_DESC"
  | "ONLINE_ACTIVE_MS_DESC"
  | "TOTAL_ACTIVE_MS_DESC";

export function useAdminUserInput() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<AdminUserTab>("ACTIVE");
  const [sort, setSort] = useState<AdminUserSort>("LAST_SEEN_DESC");

  const [page, setPage] = useState(1);
  const [draftByUser, setDraftByUser] = useState<Record<string, Draft>>({});

  const setDraft = (uid: string, patch: Partial<Draft>) => {
    setDraftByUser((prev) => {
      const cur: Draft =
        prev[uid] ?? ({
          plan: "FREE",
          startDate: "",
          endDate: "",
          myoViewer: "OFF",
          saving: false,
        } satisfies Draft);

      return { ...prev, [uid]: { ...cur, ...patch } };
    });
  };

  return {
    search,
    setSearch,

    tab,
    setTab,

    sort,
    setSort,

    page,
    setPage,

    draftByUser,
    setDraftByUser,
    setDraft,
  };
}
