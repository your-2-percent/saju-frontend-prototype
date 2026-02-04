import type { HourGZ } from "../calc/sajuTypes";
import { getBranchBgColor } from "../calc/sajuNabeum";

type Props = {
  hourCandidates: string[];
  useInsi: boolean;
  onToggleRule: () => void;
  manualHour: HourGZ | null;
  onSelectHour: (stem: string, branch: string) => void;
};

export function HourPredictionPanel({
  hourCandidates,
  useInsi,
  onToggleRule,
  manualHour,
  onSelectHour,
}: Props) {
  return (
    <div className="my-4 p-3 border rounded bg-neutral-50 dark:bg-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
          시주 후보
        </span>
        <button
          onClick={onToggleRule}
          className="px-2 py-1 text-xs rounded border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 cursor-pointer"
        >
          {useInsi ? "현재 : 인시" : "현재 : 자시"}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {hourCandidates.map((gz) => {
          const s = gz.charAt(0);
          const b = gz.charAt(1);
          const isActive = manualHour?.stem === s && manualHour?.branch === b;
          return (
            <button
              key={gz}
              onClick={() => onSelectHour(s, b)}
              className={`p-2 text-xs rounded border cursor-pointer ${
                isActive
                  ? getBranchBgColor(b)
                  : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600"
              }`}
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
