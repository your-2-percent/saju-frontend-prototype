import type { HourGZ } from "../calc/sajuTypes";
import { getBranchBgColor } from "../calc/sajuNabeum";

type Props = {
  hourCandidates: string[];
  useInsi: boolean;
  onToggleRule: () => void;
  usePrevDay: boolean;
  onTogglePrevDay: () => void;
  canSelectHourBranch?: (branch: string) => boolean;
  manualHour: HourGZ | null;
  onSelectHour: (stem: string, branch: string) => void;
};

export function HourPredictionPanel({
  hourCandidates,
  useInsi,
  onToggleRule,
  usePrevDay,
  onTogglePrevDay,
  canSelectHourBranch,
  manualHour,
  onSelectHour,
}: Props) {
  return (
    <div className="my-4 p-3 border rounded bg-neutral-50 dark:bg-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
          시주 후보
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleRule}
            className="px-2 py-1 text-xs rounded border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 cursor-pointer"
          >
            {useInsi ? "현재 : 인시" : "현재 : 자시"}
          </button>
          <button
            onClick={onTogglePrevDay}
            className={`px-2 py-1 text-xs rounded border cursor-pointer ${
              usePrevDay
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600"
            }`}
          >
            전날일주
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {hourCandidates.map((gz) => {
          const s = gz.charAt(0);
          const b = gz.charAt(1);
          const isActive = manualHour?.stem === s && manualHour?.branch === b;
          const isDisabled = canSelectHourBranch ? !canSelectHourBranch(b) : false;
          return (
            <button
              key={gz}
              onClick={() => onSelectHour(s, b)}
              disabled={isDisabled}
              className={`p-2 text-xs rounded border ${
                isActive
                  ? getBranchBgColor(b)
                  : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600"
              } ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              title={`${gz} (시주 후보)`}
            >
              {gz}
            </button>
          );
        })}
      </div>
    </div>
  );
}
