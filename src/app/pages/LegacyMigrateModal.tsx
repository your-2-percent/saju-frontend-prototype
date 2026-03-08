import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { dismissForever, dismissForToday } from "@/app/pages/legacyMigrateUtils";
import { supabase } from "@/lib/supabase";

const BRIDGE_ORIGINS = new Set(["https://myowoon96.com", "https://www.myowoon96.com"]);
const BRIDGE_TYPES = new Set(["MYOWOON_EXPORT_MYEONGSIK_V1", "MYOWOON_BRIDGE_EXPORT_V1"]);

type BridgePayload =
  | { type: string; list?: unknown; items?: unknown; payload?: unknown }
  | null
  | undefined;

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "ask" | "import";

function getBridgeList(data: BridgePayload): unknown[] {
  if (!data || typeof data !== "object") return [];
  const cands = [data.list, data.items, data.payload];
  for (const c of cands) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

export default function LegacyMigrateModal({ open, onClose }: Props) {
  const migrateLocalToServer = useMyeongSikStore((s) => s.migrateLocalToServer);
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);

  const [step, setStep] = useState<Step>("ask");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [bridgePending, setBridgePending] = useState(false);
  const bridgeTimerRef = useRef<number | null>(null);
  const bridgeHandlerRef = useRef<((event: MessageEvent<BridgePayload>) => void) | null>(null);

  const clearBridgeWait = useCallback(() => {
    if (bridgeTimerRef.current !== null) {
      window.clearTimeout(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    if (bridgeHandlerRef.current) {
      window.removeEventListener("message", bridgeHandlerRef.current);
      bridgeHandlerRef.current = null;
    }
    setBridgePending(false);
  }, []);

  const bridgeUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://myowoon96.com";
    const target = encodeURIComponent(window.location.origin);
    return `https://myowoon96.com/?bridge=myeongsik-export&target=${target}#bridge-export-v1`;
  }, []);

  useEffect(() => {
    if (!open) {
      clearBridgeWait();
      setStatus("");
      setStep("ask");
    }
  }, [open, clearBridgeWait]);

  useEffect(() => {
    return () => {
      clearBridgeWait();
    };
  }, [clearBridgeWait]);

  if (!open) return null;

  const importRows = async (rows: unknown[]) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      setStatus("가져올 명식 데이터가 비어 있습니다.");
      return;
    }

    setBusy(true);
    setStatus("명식을 불러오는 중입니다...");
    try {
      window.localStorage.setItem("myeongsikList", JSON.stringify(rows));
      await migrateLocalToServer();
      await loadFromServer();

      // 관리자 확인용: 이관된 명식 개수 저장
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            migrated_myeongsik_count: rows.length,
          })
          .eq("user_id", user.id);

        if (error) {
          console.warn("[legacy-migrate] failed to persist migrated count", error);
        }
      }

      setStatus(`명식 ${rows.length}건을 가져왔습니다. 닫기버튼을 눌러주세요.`);
      dismissForever();
    } catch (e) {
      console.error("[legacy-migrate] import failed", e);
      setStatus("가져오기 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
      setBridgePending(false);
    }
  };

  const handleBridgeImport = () => {
    if (busy) return;
    clearBridgeWait();
    setBridgePending(true);
    setStatus("myowoon96.com에서 데이터를 기다리는 중입니다...");

    const popup = window.open(bridgeUrl, "myowoon-migrate", "width=520,height=760");
    if (!popup) {
      setBridgePending(false);
      setStatus("팝업 차단으로 자동 가져오기에 실패했습니다.");
      return;
    }

    bridgeTimerRef.current = window.setTimeout(() => {
      clearBridgeWait();
      setStatus("자동 가져오기에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }, 15000);

    const onMessage = (event: MessageEvent<BridgePayload>) => {
      if (!BRIDGE_ORIGINS.has(event.origin)) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      if (!BRIDGE_TYPES.has(payload.type)) return;

      clearBridgeWait();
      const list = getBridgeList(payload);
      void importRows(list);
    };

    bridgeHandlerRef.current = onMessage;
    window.addEventListener("message", onMessage);
  };

  const handleNoMigration = () => {
    const confirmed = window.confirm(
      "이관을 하지 않고 창을 닫으시겠습니까?"
    );
    if (confirmed) {
      dismissForever();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[220] bg-black/70 flex items-center justify-center px-3">
      <div className="w-full max-w-[560px] max-h-[90dvh] overflow-auto rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xl">

        {step === "ask" ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  myowoon96.com (묘운만세력) 명식 이관이 필요하신가요?
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  이전 사이트의 명식 데이터를 현재 계정으로 가져올 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("import")}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                예
              </button>
              <button
                type="button"
                onClick={handleNoMigration}
                className="flex-1 py-3 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                아니오
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => { setStep("ask"); setStatus(""); clearBridgeWait(); }}
                  className="mb-1 text-xs text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer"
                >
                  ← 이전
                </button>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">myowoon96 명식 가져오기</h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  구 사이트 localStorage 명식을 현재 계정/게스트 저장소로 가져옵니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                닫기
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/20 p-3">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-2">자동 가져오기(팝업)</p>
              <button
                type="button"
                onClick={handleBridgeImport}
                disabled={busy}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
              >
                myowoon96.com에서 자동 가져오기
              </button>
              {bridgePending && (
                <p className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-300">
                  팝업이 열리면 안내 메시지를 확인하고 잠시 기다려 주세요.
                </p>
              )}
            </div>

            {status && (
              <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 px-2 py-1.5">
                {status}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { dismissForToday(); onClose(); }}
                className="px-2.5 py-1.5 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                오늘 하루 보지 않기
              </button>
              <button
                type="button"
                onClick={() => { dismissForever(); onClose(); }}
                className="px-2.5 py-1.5 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                더 이상 보지 않기
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto px-2.5 py-1.5 text-[11px] rounded bg-neutral-900 text-white cursor-pointer"
              >
                닫기
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
