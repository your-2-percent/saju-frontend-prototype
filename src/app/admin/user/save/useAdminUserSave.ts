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

// ✅ PlanTier 타입가드(파일 로컬)
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

/** 빈 문자열이면 null */
function nonEmptyOrNull(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

/** YYYY-MM-DD 검증 */
function isValidYmd(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return false;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false;
  if (mo < 1 || mo > 12) return false;

  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** YYYY-MM-DD + days => YYYY-MM-DD (UTC 기준) */
function addDaysYmd(ymd: string, days: number): string {
  if (!isValidYmd(ymd)) throw new Error(`날짜 형식이 올바르지 않음: ${ymd}`);

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`날짜 형식이 올바르지 않음: ${ymd}`);

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);

  const yy = String(dt.getUTCFullYear()).padStart(4, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** YYYY-MM-DD -> ISO(UTC 00:00:00Z) */
function ymdToIsoUtcStart(ymd: string): string {
  if (!isValidYmd(ymd)) throw new Error(`날짜 형식이 올바르지 않음: ${ymd}`);
  return `${ymd}T00:00:00.000Z`;
}

type RpcErrShape = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function isRpcErrShape(v: unknown): v is RpcErrShape {
  return typeof v === "object" && v !== null;
}

function dumpRpcError(tag: string, err: unknown): void {
  // ✅ 1) raw
  console.error(tag, err);

  // ✅ 2) fields
  if (isRpcErrShape(err)) {
    console.error(`${tag} fields`, {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
    });
  }

  // ✅ 3) non-enumerable까지 포함해서
  if (typeof err === "object" && err !== null) {
    try {
      console.error(`${tag} ownKeys`, Object.getOwnPropertyNames(err));
    } catch {
      // ignore
    }
  }

  // ✅ 4) stringify 시도
  try {
    console.error(`${tag} json`, JSON.stringify(err));
  } catch {
    // ignore
  }
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

  /**
   * ✅ 실제 저장: 운영형 RPC로 entitlements 업데이트
   * - 시작일: YYYY-MM-DD => starts_at = 그날 00:00Z
   * - 종료일: YYYY-MM-DD(포함) => expires_at = (endDate+1일) 00:00Z (배타/Exclusive)
   */
  const saveEntitlements = useCallback(
    async (
      uid: string,
      draft: Draft | undefined,
      setDraft: (uid: string, patch: Partial<Draft>) => void,
      refresh: () => Promise<void>
    ) => {
      if (!draft) return;

      setError(null);
      setDraft(uid, { saving: true });

      try {
        if (!isPlanTierValue(draft.plan)) {
          throw new Error(`잘못된 플랜 값: ${String(draft.plan)}`);
        }

        const startYmd = nonEmptyOrNull(draft.startDate);
        const endYmdInclusive = nonEmptyOrNull(draft.endDate);

        const startsAt = startYmd ? ymdToIsoUtcStart(startYmd) : null;
        const expiresAt = endYmdInclusive ? ymdToIsoUtcStart(addDaysYmd(endYmdInclusive, 1)) : null;

        // 기간 역전 방지(둘 다 있을 때만)
        if (startsAt && expiresAt) {
          const s = Date.parse(startsAt);
          const e = Date.parse(expiresAt);
          if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error("날짜 파싱 실패");
          if (e <= s) throw new Error("종료일이 시작일보다 빠릅니다.");
        }

        // ✅ 호출 파라미터 (스샷 시그니처랑 동일)
        const payload = {
          p_target_user_id: uid,
          p_plan: draft.plan, // <- DB 제약이 소문자면 여기서 터짐(에러 메시지로 확인)
          p_can_use_myo_viewer: draft.myoViewer === "ON",
          p_starts_at: startsAt,
          p_expires_at: expiresAt,
        };

        const { error: rpcErr } = await supabase.rpc("admin_set_user_entitlements", payload);

        if (rpcErr) {
          dumpRpcError("admin_set_user_entitlements error", rpcErr);
          throw rpcErr;
        }

        setDraft(uid, { saving: false, lastSavedAt: Date.now() });
        await refresh();
      } catch (e) {
        setDraft(uid, { saving: false });
        setError(e instanceof Error ? e.message : "저장 실패");
        throw e;
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
