import type { Dispatch, SetStateAction } from "react";

export type UnseongMode = "bong" | "jwa" | "geo" | "injong";
export type InjongTarget = "bigeop" | "siksang" | "jaeseong" | "gwanseong" | "inseong";

type Props = {
  mode: UnseongMode;
  setMode: Dispatch<SetStateAction<UnseongMode>>;
  injongTarget: InjongTarget;
  setInjongTarget: Dispatch<SetStateAction<InjongTarget>>;
};

export default function UnseongSelector({
  mode,
  setMode,
  injongTarget,
  setInjongTarget,
}: Props) {
  const modes = [
    { key: "bong", label: "봉법(일간)" },
    { key: "jwa", label: "좌법(자좌)" },
    { key: "geo", label: "거법(연간)" },
    { key: "injong", label: "인종법" },
  ] as const;

  const targets = [
    { key: "bigeop", label: "비겁" },
    { key: "siksang", label: "식상" },
    { key: "jaeseong", label: "재성" },
    { key: "gwanseong", label: "관성" },
    { key: "inseong", label: "인성" },
  ] as const;

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0 pl-1">
          십이운성 기준
        </span>
        <div className="flex bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5 overflow-hidden">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1.5 text-[11px] rounded-md transition-all whitespace-nowrap cursor-pointer ${
                mode === m.key
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black font-bold shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 font-medium"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "injong" && (
        <div className="flex items-center gap-2 mt-1 animate-fadeIn pl-1">
          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
            인종 대상:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setInjongTarget(t.key)}
                className={`px-2 py-0.5 text-[10px] border rounded-full transition-colors cursor-pointer ${
                  injongTarget === t.key
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 font-bold"
                    : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
