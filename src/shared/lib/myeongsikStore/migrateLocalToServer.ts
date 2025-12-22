import type { MyeongSik } from "@/shared/lib/storage";
import type { OldPersistRoot } from "@/shared/lib/myeongsikStore/types";
import type { MyeongSikRepo } from "@/shared/lib/myeongsikStore/repo/ports";

const LEGACY_KEY = "myeongsik-list";

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function migrateLegacyLocalListToServer(repo: MyeongSikRepo): Promise<void> {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  const parsed = safeJsonParse(raw) as OldPersistRoot | null;
  if (!parsed) {
    window.localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const state = parsed.state ?? {};
  const localList = Array.isArray(state.list) ? state.list : [];

  if (localList.length === 0) {
    window.localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const user = await repo.getUser();
  if (!user) return;

  const serverRows = await repo.fetchRows(user.id);
  const existingIds = new Set<string>(serverRows.map((r) => r.id));

  const toInsert = localList.filter((item): item is MyeongSik => {
    return !!item && typeof item.id === "string" && item.id.trim() !== "" && !existingIds.has(item.id);
  });

  for (const item of toInsert) {
    // legacy list에는 계산 필드가 없을 수 있어서 서버 write는 최소필드만 넣는다.
    await repo.upsertOne(user.id, item);
  }

  window.localStorage.removeItem(LEGACY_KEY);
}
