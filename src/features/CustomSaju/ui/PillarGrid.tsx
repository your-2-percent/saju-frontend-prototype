import type { Pillars } from "../input/customSajuTypes";

export function PillarGrid({
  pillars,
  active,
  canEnterOthers,
  onActivate,
}: {
  pillars: Pillars;
  active: keyof Pillars | null;
  canEnterOthers: boolean;
  onActivate: (key: keyof Pillars) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {([
        ["hourStem","시간"],["dayStem","일간"],["monthStem","월간"],["yearStem","연간"],
        ["hourBranch","시지"],["dayBranch","일지"],["monthBranch","월지"],["yearBranch","연지"],
      ] as const).map(([key, label]) => {
        const disabled = !canEnterOthers &&
          !(key === "yearStem" || key === "yearBranch" || key === "dayStem" || key === "dayBranch");
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => !disabled && onActivate(key)}
            disabled={disabled}
            className={[
              "border rounded p-2 text-center cursor-pointer",
              isActive ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30" : "border-neutral-300 dark:border-neutral-700",
              disabled ? "opacity-50 cursor-not-allowed" : ""
            ].join(" ")}
          >
            {label}<br/>
            <span className="font-bold">{pillars[key] ?? "-"}</span>
          </button>
        );
      })}
    </div>
  );
}
