import type { Draft, EntRow, EntRowRaw, MyeongsikRow, ProfileRow, UserSummary } from "../model/types";
import { coercePlanTier, toYMDInput } from "./planUtils";

export const PAGE_SIZE = 20;

export function getPagedUserIds(userIds: string[], page: number): string[] {
  const start = (page - 1) * PAGE_SIZE;
  return userIds.slice(start, start + PAGE_SIZE);
}

export function getTotalPages(userIds: string[]): number {
  return Math.max(1, Math.ceil(userIds.length / PAGE_SIZE));
}

function coerceBoolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function buildUserSummaries(args: {
  userIds: string[];
  profiles: ProfileRow[];
  myeongsikRows: MyeongsikRow[];
  entRows: EntRowRaw[];
}): UserSummary[] {
  const { userIds, profiles, myeongsikRows, entRows } = args;

  const profileMap: Record<string, ProfileRow | null> = {};
  for (const p of profiles) {
    const key = p.user_id || p.id;
    if (key) profileMap[key] = p;
  }

  const entMap: Record<string, EntRow> = {};
  for (const r of entRows) {
    const plan = coercePlanTier(r.plan);
    entMap[r.user_id] = {
      user_id: r.user_id,
      plan,
      starts_at: r.starts_at ?? null,
      expires_at: r.expires_at ?? null,
      can_use_myo_viewer: coerceBoolOrNull(r.can_use_myo_viewer),
    };
  }

  const summaryMap: Record<string, UserSummary> = {};
  for (const uid of userIds) {
    summaryMap[uid] = {
      user_id: uid,
      profile: profileMap[uid] || null,
      myeongsikCount: 0,
      lastCreatedAt: null,
      ent: entMap[uid] || null,
    };
  }

  for (const row of myeongsikRows) {
    const s = summaryMap[row.user_id];
    if (!s) continue; // 안전: userIds에 없는 row가 섞여도 터지지 않게

    s.myeongsikCount += 1;

    // ✅ 최신 created_at 추적(ISO라면 Date 비교가 안전)
    const cur = s.lastCreatedAt;
    const next = row.created_at ?? null;

    if (!next) continue;
    if (!cur) {
      s.lastCreatedAt = next;
      continue;
    }

    const curT = Date.parse(cur);
    const nextT = Date.parse(next);
    if (Number.isFinite(nextT) && (!Number.isFinite(curT) || nextT > curT)) {
      s.lastCreatedAt = next;
    }
  }

  return Object.values(summaryMap);
}

export function initDrafts(prev: Record<string, Draft>, summaries: UserSummary[]): Record<string, Draft> {
  const next: Record<string, Draft> = { ...prev };

  for (const s of summaries) {
    const ent = s.ent;

    const plan = ent?.plan ?? "FREE";
    const startDate = toYMDInput(ent?.starts_at ?? null);
    const endDate = toYMDInput(ent?.expires_at ?? null);

    // ✅ null/true는 ON 기본, false만 OFF
    const myoViewer: Draft["myoViewer"] = ent?.can_use_myo_viewer === true ? "ON" : "OFF";

    const cur = next[s.user_id];

    if (!cur) {
      next[s.user_id] = {
        plan,
        startDate,
        endDate,
        saving: false,
        myoViewer,
      };
      continue;
    }

    if (cur.saving) continue;

    if (
      cur.plan !== plan ||
      cur.startDate !== startDate ||
      cur.endDate !== endDate ||
      cur.myoViewer !== myoViewer
    ) {
      next[s.user_id] = { ...cur, plan, startDate, endDate, myoViewer };
    }
  }

  return next;
}
