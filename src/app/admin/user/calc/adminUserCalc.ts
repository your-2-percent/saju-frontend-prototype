// src/app/admin/user/calc/adminUserCalc.ts
import type {
  Draft,
  EntRow,
  EntRowRaw,
  MyeongsikRow,
  ProfileRow,
  UserSummary,
} from "../model/types";
import { coercePlanTier, toYMDInput } from "./planUtils";
import type { UserActivityRow } from "../save/repo/fetchUserActivity";

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

type BuildArgs = {
  userIds: string[];
  profiles: ProfileRow[];
  myeongsikRows: MyeongsikRow[];
  entRows: EntRowRaw[]; // ✅ Raw로 받는다 (plan: unknown 문제 해결)
  activityRows: UserActivityRow[];
};

export function buildUserSummaries(args: BuildArgs): UserSummary[] {
  const { userIds, profiles, myeongsikRows, entRows, activityRows } = args;

  const actByUserId = new Map<string, UserActivityRow>();
  for (const a of activityRows) actByUserId.set(a.user_id, a);

  const profileMap: Record<string, ProfileRow | null> = {};
  for (const p of profiles) {
    const key = p.user_id || p.id;
    if (key) profileMap[key] = p;
  }

  // ✅ 단일 엔트(배열 아님) + Raw → EntRow로 정규화
  const entMap: Record<string, EntRow | null> = {};
  for (const r of entRows) {
    const plan = coercePlanTier(r.plan); // unknown → PlanTier|null
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
    const act = actByUserId.get(uid) ?? null;

    summaryMap[uid] = {
      user_id: uid,
      profile: profileMap[uid] || null,
      myeongsikCount: 0,
      lastCreatedAt: null,
      ent: entMap[uid] || null,
      lastSeenAt: act?.last_seen_at ?? null,
      lastSeenPath: act?.last_path ?? null,
      totalActiveMs: act?.total_active_ms ?? null,
    };
  }

  for (const row of myeongsikRows) {
    const s = summaryMap[row.user_id];
    if (!s) continue;

    s.myeongsikCount += 1;

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

  return userIds.map((uid) => summaryMap[uid]);
}

export function initDrafts(
  prev: Record<string, Draft>,
  summaries: UserSummary[]
): Record<string, Draft> {
  const next: Record<string, Draft> = { ...prev };

  for (const s of summaries) {
    const ent = s.ent;

    const plan = ent?.plan ?? "FREE";
    const startDate = toYMDInput(ent?.starts_at ?? null);
    const endDate = toYMDInput(ent?.expires_at ?? null);

    const myoViewer: Draft["myoViewer"] = ent?.can_use_myo_viewer === true ? "ON" : "OFF";

    const cur = next[s.user_id];

    if (!cur) {
      next[s.user_id] = {
        plan,
        startDate,
        endDate,
        saving: false,
        myoViewer,
        // ✅ lastSavedAt는 Draft가 number|undefined라서 null 넣지마
        // lastSavedAt: undefined (생략)
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
