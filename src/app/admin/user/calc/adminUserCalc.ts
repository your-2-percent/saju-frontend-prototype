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

export function buildUserSummaries(args: {
  userIds: string[];
  profiles: ProfileRow[];
  myeongsikRows: MyeongsikRow[];
  entRows: EntRowRaw[];
}): UserSummary[] {
  const { userIds, profiles, myeongsikRows, entRows } = args;

  const profileMap: Record<string, ProfileRow | null> = {};
  profiles.forEach((p) => {
    const key = p.user_id || p.id;
    if (key) profileMap[key] = p;
  });

  const entMap: Record<string, EntRow> = {};
  entRows.forEach((r) => {
    const plan = coercePlanTier(r.plan);
    entMap[r.user_id] = {
      user_id: r.user_id,
      plan,
      starts_at: r.starts_at ?? null,
      expires_at: r.expires_at ?? null,
    };
  });

  const summaryMap: Record<string, UserSummary> = {};
  userIds.forEach((uid) => {
    summaryMap[uid] = {
      user_id: uid,
      profile: profileMap[uid] || null,
      myeongsikCount: 0,
      lastCreatedAt: null,
      ent: entMap[uid] || null,
    };
  });

  myeongsikRows.forEach((row) => {
    summaryMap[row.user_id].myeongsikCount++;
    if (!summaryMap[row.user_id].lastCreatedAt) {
      summaryMap[row.user_id].lastCreatedAt = row.created_at;
    }
  });

  return Object.values(summaryMap);
}

export function initDrafts(prev: Record<string, Draft>, summaries: UserSummary[]): Record<string, Draft> {
  const next: Record<string, Draft> = { ...prev };
  summaries.forEach((s) => {
    const ent = s.ent;
    const plan = ent?.plan ?? "PROMPT_LOCKED";
    const startDate = toYMDInput(ent?.starts_at ?? null);
    const endDate = toYMDInput(ent?.expires_at ?? null);
    const cur = next[s.user_id];

    if (!cur) {
      next[s.user_id] = {
        plan,
        startDate,
        endDate,
        saving: false,
      };
      return;
    }

    if (cur.saving) return;

    if (cur.plan !== plan || cur.startDate !== startDate || cur.endDate !== endDate) {
      next[s.user_id] = { ...cur, plan, startDate, endDate };
    }
  });
  return next;
}
