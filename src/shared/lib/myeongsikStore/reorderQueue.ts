import type { MyeongSikWithOrder } from "@/shared/lib/myeongsikStore/types";
import type { MyeongSikRepo } from "@/shared/lib/myeongsikStore/repo/ports";

const REORDER_DEBOUNCE_MS = 250;

type PendingReorder = {
  key: string;
  list: MyeongSikWithOrder[];
  promise: Promise<void>;
  resolve: () => void;
};

function makeReorderKey(list: MyeongSikWithOrder[]): string {
  // id + sortOrder + folder + favorite만으로 “저장해야 할 변경” 판단
  return list
    .map((m) => {
      const folder = typeof m.folder === "string" ? m.folder.trim() : "";
      const so = typeof m.sortOrder === "number" && Number.isFinite(m.sortOrder) ? m.sortOrder : "";
      const fav = m.favorite ? 1 : 0;
      return `${m.id}:${so}:${folder}:${fav}`;
    })
    .join("|");
}

function installFlushListenersOnce(flush: () => void): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as Record<string, unknown>;
  const FLAG = "__hm_reorder_flush_installed__";
  if (w[FLAG] === true) return;
  w[FLAG] = true;

  window.addEventListener("beforeunload", () => flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function createReorderWriteQueue(repo: MyeongSikRepo) {
  let reorderTimer: number | null = null;
  let pending: PendingReorder | null = null;
  let flushing = false;
  let lastSentKey = "";

  async function flushPending(): Promise<void> {
    if (flushing) return;
    flushing = true;

    try {
      while (pending) {
        const cur = pending;
        pending = null;

        if (cur.key && cur.key === lastSentKey) {
          cur.resolve();
          continue;
        }

        const user = await repo.getUser();
        if (!user) {
          console.warn("reorder flush skipped: no user");
          cur.resolve();
          continue;
        }

        await repo.upsertOrderPatch(user.id, cur.list);
        lastSentKey = cur.key;
        cur.resolve();
      }
    } finally {
      flushing = false;
    }
  }

  installFlushListenersOnce(() => {
    void flushPending();
  });

  function queue(list: MyeongSikWithOrder[], opts?: { immediate?: boolean }): Promise<void> {
    const key = makeReorderKey(list);

    if (key && key === lastSentKey && !pending) return Promise.resolve();

    if (!pending) {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      pending = { key, list, promise, resolve };
    } else {
      pending.key = key;
      pending.list = list;
    }

    if (typeof window === "undefined") {
      void flushPending();
      return pending.promise;
    }

    if (reorderTimer) window.clearTimeout(reorderTimer);

    if (opts?.immediate) {
      void flushPending();
    } else {
      reorderTimer = window.setTimeout(() => {
        reorderTimer = null;
        void flushPending();
      }, REORDER_DEBOUNCE_MS);
    }

    return pending.promise;
  }

  return {
    queue,
    flushNow: flushPending,
  };
}
