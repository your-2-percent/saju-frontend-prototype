// src/app/admin/user/list/save/useAdminUserSave.ts
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Draft } from "../model/types";
import type { PlanTier } from "@/shared/billing/entitlements";
import type { AdminUserTab, AdminUserSort } from "../input/useAdminUserInput";

export const PAGE_SIZE = 20;

export type AdminListUserRow = {
  user_id: string;

  name: string | null;
  nickname: string | null;
  email: string | null;
  disabled_at: string | null;
  created_at: string | null;

  // ✅ 핵심: Draft.plan이 쓰는 PlanTier로 통일
  plan: PlanTier | null;
  starts_at: string | null;
  expires_at: string | null;
  can_use_myo_viewer: boolean | null;

  myeongsik_count: number | null;

  last_seen_at: string | null;
  last_path: string | null;
  total_active_ms: number | null;

  online: boolean | null;
  total_count: number | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function toBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ✅ PlanTier 타입가드: 다른 파일 타입 섞이는 거 방지용으로 여기서 “직접” 정의
function isPlanTierValue(v: unknown): v is PlanTier {
  return v === "FREE" || v === "BASIC" || v === "PRO";
}

function parsePlan(v: unknown): PlanTier | null {
  return isPlanTierValue(v) ? v : null;
}

function parseRow(v: unknown): AdminListUserRow | null {
  if (!isRecord(v)) return null;

  const user_id = toStr(v.user_id);
  if (!user_id) return null;

  return {
    user_id,

    name: toStr(v.name),
    nickname: toStr(v.nickname),
    email: toStr(v.email),
    disabled_at: toStr(v.disabled_at),
    created_at: toStr(v.created_at),

    // ✅ 여기에서 string → PlanTier로 확정 변환
    plan: parsePlan(v.plan),
    starts_at: toStr(v.starts_at),
    expires_at: toStr(v.expires_at),
    can_use_myo_viewer: toBool(v.can_use_myo_viewer),

    myeongsik_count: toNum(v.myeongsik_count),

    last_seen_at: toStr(v.last_seen_at),
    last_path: toStr(v.last_path),
    total_active_ms: toNum(v.total_active_ms),

    online: toBool(v.online),
    total_count: toNum(v.total_count),
  };
}

export function useAdminUserSave() {
  const [rows, setRows] = useState<AdminListUserRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (args: { search: string; tab: AdminUserTab; sort: AdminUserSort; page: number }) => {
      const { search, tab, sort, page } = args;

      setLoading(true);
      setError(null);

      try {
        const offset = Math.max(0, (Math.max(1, page) - 1) * PAGE_SIZE);

        const { data, error: rpcErr } = await supabase.rpc("admin_list_users", {
          p_search: search && search.trim() ? search.trim() : null,
          p_tab: tab,
          p_sort: sort,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        });

        if (rpcErr) throw rpcErr;

        const raw = Array.isArray(data) ? data : [];
        const parsed = raw.map(parseRow).filter((x): x is AdminListUserRow => x !== null);

        setRows(parsed);
        setTotalCount(parsed[0]?.total_count ?? 0);
      } catch (e) {
        setRows([]);
        setTotalCount(0);
        setError(e instanceof Error ? e.message : "목록 조회 실패");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ 네가 원래 쓰던 saveEntitlements 그대로 유지해 (여기 내용은 생략)
  const saveEntitlements = useCallback(
    async (
      uid: string,
      draft: Draft | undefined,
      setDraft: (uid: string, patch: Partial<Draft>) => void,
      refresh: () => Promise<void>
    ) => {
      if (!draft) return;

      setDraft(uid, { saving: true });
      try {
        // ✅ 너 기존 로직 그대로 넣어
        setDraft(uid, { saving: false, lastSavedAt: Date.now() });
        await refresh();
      } catch (e) {
        setDraft(uid, { saving: false });
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    },
    []
  );

  return {
    rows,
    totalCount,
    loading,
    error,
    setError,
    fetchList,
    saveEntitlements,
  };
}
