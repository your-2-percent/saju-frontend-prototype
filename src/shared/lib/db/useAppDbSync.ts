import { useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { isSessionOlderThan, TWO_HOURS_MS } from "./sessionAge";
import { startBinding, type RunningBinding } from "@/shared/lib/settings/bindStoreToUserSettingsKv";
import { usePromptCopySectionsStore, type PromptCopySections } from "@/features/PromptCopyCard/promptCopySectionsStore";

// ✅ 너 프로젝트에 맞게 “DB에서 바뀔 수 있는 테이블”을 여기에 전부 등록해
type SyncTable = {
  table: string;
  // user_id 컬럼 있는 테이블만 필터 가능. 없으면 filter 빼고 전체 이벤트 받게 됨(비추)
  filterByUserId?: boolean;
  // 변경 오면 뭘 할지 (리스트 refetch, 캐시 invalidation 등)
  onChange?: () => void;
};

// ⚠️ 테이블명은 너 DB 실제 이름으로 바꿔.
// 예: 명식 테이블이 "ms"면 ms로, "myeongsik"이면 그걸로.
const SYNC_TABLES: SyncTable[] = [
  { table: "user_settings_kv", filterByUserId: true },
  { table: "ms", filterByUserId: true }, // TODO: 명식 테이블명
  // { table: "folders", filterByUserId: true, onChange: () => refreshFolders() },
  // { table: "memos", filterByUserId: true, onChange: () => refreshMemos() },
];

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

/**
 * ✅ 앱 루트에서 1번만 호출
 * - 설정: 바뀌면 즉시 DB 저장 / DB 바뀌면 즉시 반영
 * - 데이터: Realtime 이벤트 오면 onChange 호출(여기에 “전부” 달아)
 * - 2시간 넘으면 hard reload도 실행
 */
export function useAppDbSync(userId: string | null) {
  // 1) 설정 바인딩들 (여기에 “모든 설정 store”를 계속 추가하면 됨)
  const bindings = useMemo<RunningBinding[]>(() => {
    if (!userId) return [];

    const runs: RunningBinding[] = [];

    // (A) PromptCopyCard 섹션 체크박스
    runs.push(
      startBinding(userId, {
        dbKey: "promptCopy.sections",
        store: usePromptCopySectionsStore,
        select: (s) => s.sections,
        apply: (slice) => usePromptCopySectionsStore.setState({ sections: slice }),
        validate: isPromptCopySections,
        debounceMs: 250,
      }),
    );

    // (B) 너가 가진 다른 설정 store들 전부 여기다 붙이면 끝
    // 예)
    // runs.push(
    //   startBinding(userId, {
    //     dbKey: "saju.settings",
    //     store: useSajuSettingsStore,
    //     select: (s) => ({
    //       shinsalEra: s.shinsalEra,
    //       shinsalGaehwa: s.shinsalGaehwa,
    //       shinsalBase: s.shinsalBase,
    //       // ...여기서 “DB에 저장할 설정”만 뽑아
    //     }),
    //     apply: (slice) => useSajuSettingsStore.setState(slice),
    //     validate: (v): v is { shinsalEra: unknown; shinsalGaehwa: unknown; shinsalBase: unknown } =>
    //       typeof v === "object" && v !== null,
    //   }),
    // );

    return runs;
  }, [userId]);

  // 2) 최초 로드(설정들 DB → store)
  useEffect(() => {
    if (!userId) return;
    void Promise.all(bindings.map((b) => b.loadFromDb())).catch((e) => {
      console.error("[settings] initial load failed", e);
    });
  }, [userId, bindings]);

  // 3) Realtime 구독(DB → 앱 반영 + 2시간 조건 hard reload)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`app-sync:${userId}`);

    for (const t of SYNC_TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: t.table,
          ...(t.filterByUserId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload) => {
          // ✅ 접속 2시간 넘으면 그냥 새로고침(너가 원한 조건)
          if (isSessionOlderThan(TWO_HOURS_MS)) {
            window.location.reload();
            return;
          }

          // 설정 테이블이면 “키 단위”로 즉시 반영
          if (t.table === "user_settings_kv") {
            const newRow = payload.new as unknown;
            const oldRow = payload.old as unknown;

            const keyFrom = (row: unknown): string | null => {
              if (typeof row !== "object" || row === null) return null;
              const r = row as Record<string, unknown>;
              return typeof r.setting_key === "string" ? r.setting_key : null;
            };

            const valueFrom = (row: unknown): unknown => {
              if (typeof row !== "object" || row === null) return null;
              const r = row as Record<string, unknown>;
              return r.value;
            };

            const changedKey = keyFrom(newRow) ?? keyFrom(oldRow);
            if (!changedKey) return;

            const binding = bindings.find((b) => b.dbKey === changedKey);
            if (!binding) return;

            // UPDATE/INSERT면 payload.new.value로 바로 반영
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              binding.applyRemote(valueFrom(newRow));
              return;
            }

            // DELETE면 다시 로드
            void binding.loadFromDb();
            return;
          }

          // 나머지 테이블들은 각자 onChange에서 “refetch/patch” 하면 됨
          t.onChange?.();
        },
      );
    }

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, bindings]);

  // 4) 언마운트 시 정리
  useEffect(() => {
    return () => {
      for (const b of bindings) b.stop();
    };
  }, [bindings]);
}
