// shared/lib/db/useAppDbSync.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isSessionOlderThan, TWO_HOURS_MS } from "./sessionAge";
import {
  startBinding,
  type RunningBinding,
} from "@/shared/lib/settings/bindStoreToUserSettingsKv";
import {
  usePromptCopySectionsStore,
  type PromptCopySections,
} from "@/features/PromptCopyCard/promptCopySectionsStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";

type SyncTable = {
  table: string;
  filterByUserId?: boolean;
  /**
   * payload는 supabase-js 버전마다 타입이 달라서 unknown으로 받는다.
   * 필요하면 내부에서 안전하게 파싱.
   */
  onChange?: (payload: unknown) => void;
  /**
   * 같은 테이블 이벤트가 연속으로 올 때 폭주 방지
   */
  debounceMs?: number;
};

function isPromptCopySections(v: unknown): v is PromptCopySections {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const keys: Array<keyof PromptCopySections> = [
    "twelveUnseong",
    "twelveShinsal",
    "shinsal",
    "nabeum",
  ];
  return keys.every((k) => typeof o[k] === "boolean");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function useAppDbSync(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const bindings: RunningBinding[] = [];

    // 1) 설정 바인딩 (예: PromptCopyCard 체크박스)
    bindings.push(
      startBinding(userId, {
        dbKey: "promptCopy.sections",
        store: usePromptCopySectionsStore,
        select: (s) => s.sections,
        apply: (slice) => usePromptCopySectionsStore.setState({ sections: slice }),
        validate: isPromptCopySections,
        debounceMs: 250,
      }),
    );

    // 최초 로드
    void Promise.all(bindings.map((b) => b.loadFromDb())).catch((e) => {
      console.error("[settings] initial load failed", e);
    });

    // 2) Realtime 구독 테이블 목록
    //    ✅ 여기서 한 군데에서만 구독 관리하는 걸 추천 (중복구독하면 난리남 ㅠ)
    const tables: SyncTable[] = [
      { table: "user_settings_kv", filterByUserId: true },

      // ✅ 명식: DB에서 바뀌면(다른 기기 포함) loadFromServer로 싱크
      // reorder 같이 이벤트가 연속으로 들어올 수 있어서 debounce 걸어둠
      {
        table: "myeongsik",
        filterByUserId: true,
        debounceMs: 200,
        onChange: () => {
          void useMyeongSikStore.getState().loadFromServer();
        },
      },

      // TODO: 다른 테이블도 동일 패턴으로 추가
      // { table: "folders", filterByUserId: true, debounceMs: 200, onChange: () => void useFolderStore.getState().loadFromServer() },
    ];

    // 테이블별 debounce 타이머
    const debounceTimers = new Map<string, number>();

    const fireDebounced = (key: string, ms: number, fn: () => void) => {
      const prev = debounceTimers.get(key);
      if (prev) window.clearTimeout(prev);

      const t = window.setTimeout(() => {
        debounceTimers.delete(key);
        fn();
      }, ms);

      debounceTimers.set(key, t);
    };

    const channel = supabase.channel(`app-sync:${userId}`);

    for (const t of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: t.table,
          ...(t.filterByUserId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload: unknown) => {
          // ✅ 접속 2시간 넘으면 hard reload
          if (isSessionOlderThan(TWO_HOURS_MS)) {
            window.location.reload();
            return;
          }

          // 설정 테이블은 “키 단위”로 즉시 반영
          if (t.table === "user_settings_kv") {
            if (!isRecord(payload)) return;

            const newRow = payload["new"];
            const oldRow = payload["old"];

            const getKey = (row: unknown): string | null => {
              if (!isRecord(row)) return null;
              return typeof row.setting_key === "string" ? row.setting_key : null;
            };

            const getValue = (row: unknown): unknown => {
              if (!isRecord(row)) return null;
              return row.value;
            };

            const changedKey = getKey(newRow) ?? getKey(oldRow);
            if (!changedKey) return;

            const binding = bindings.find((b) => b.dbKey === changedKey);
            if (!binding) return;

            const eventType =
              typeof payload.eventType === "string" ? payload.eventType : "";

            if (eventType === "INSERT" || eventType === "UPDATE") {
              binding.applyRemote(getValue(newRow));
              return;
            }

            // DELETE면 그냥 다시 읽어오기
            void binding.loadFromDb();
            return;
          }

          // 그 외 테이블은 onChange 실행 (디바운스 가능)
          if (t.onChange) {
            const ms = typeof t.debounceMs === "number" ? t.debounceMs : 0;
            if (ms > 0) {
              fireDebounced(t.table, ms, () => t.onChange?.(payload));
            } else {
              t.onChange(payload);
            }
          }
        },
      );
    }

    void channel.subscribe();

    return () => {
      for (const b of bindings) b.stop();

      for (const [, timer] of debounceTimers) window.clearTimeout(timer);
      debounceTimers.clear();

      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
