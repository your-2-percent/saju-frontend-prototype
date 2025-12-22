import type { MultiTab } from "@/features/PromptCopyCard/types";

type DaeItem = {
  gz: string;
  age: number;
  startYear: number;
  endYear: number;
};

type Props = {
  multiTab: MultiTab;
  setMultiTab: (tab: MultiTab) => void;

  daeList: DaeItem[];
  selectedDaeIdx: number[];
  onToggleDae: (idx: number) => void;

  seStartYear: number;
  seEndYear: number;
  onSeStartChange: (year: number) => void;
  onSeEndChange: (year: number) => void;
  onSeStartBlur: () => void;
  onSeEndBlur: () => void;
  seYearsCount: number;

  wolStartDate: string;
  wolEndDate: string;
  onWolStartChange: (ym: string) => void;
  onWolEndChange: (ym: string) => void;
  onWolStartBlur: () => void;
  onWolEndBlur: () => void;
  wolMonthsCount: number;

  ilStartDate: string;
  ilEndDate: string;
  onIlStartChange: (ymd: string) => void;
  onIlEndChange: (ymd: string) => void;
  onIlStartBlur: () => void;
  onIlEndBlur: () => void;
  ilDaysCount: number;
};

export default function MultiModeControls({
  multiTab,
  setMultiTab,
  daeList,
  selectedDaeIdx,
  onToggleDae,
  seStartYear,
  seEndYear,
  onSeStartChange,
  onSeEndChange,
  onSeStartBlur,
  onSeEndBlur,
  seYearsCount,
  wolStartDate,
  wolEndDate,
  onWolStartChange,
  onWolEndChange,
  onWolStartBlur,
  onWolEndBlur,
  wolMonthsCount,
  ilStartDate,
  ilEndDate,
  onIlStartChange,
  onIlEndChange,
  onIlStartBlur,
  onIlEndBlur,
  ilDaysCount,
}: Props) {
  return (
    <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
      <div className="flex gap-1.5 border-b pb-2">
        {(["대운", "세운", "월운", "일운"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMultiTab(tab)}
            className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
              multiTab === tab
                ? "bg-blue-600 text-white font-semibold"
                : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {multiTab === "대운" && (
        <div>
          <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            대운 선택 (다중 선택 가능)
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {daeList.map((dae, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleDae(idx)}
                className={`px-2 py-1.5 text-xs rounded border cursor-pointer text-left ${
                  selectedDaeIdx.includes(idx)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                }`}
              >
                <div className="font-mono">{dae.gz}</div>
                <div className="text-[10px] opacity-80">
                  {dae.age}세 ({dae.startYear}~{dae.endYear})
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {multiTab === "세운" && (
        <div>
          <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            세운 범위 (최대 10년)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={seStartYear}
              onChange={(e) => onSeStartChange(Number(e.target.value))}
              onBlur={onSeStartBlur}
              className="w-24 px-2 h-30 text-xs border rounded bg-white dark:bg-neutral-700"
            />
            <span className="text-xs">~</span>
            <input
              type="number"
              value={seEndYear}
              onChange={(e) => onSeEndChange(Number(e.target.value))}
              onBlur={onSeEndBlur}
              className="w-24 px-2 h-30 text-xs border rounded bg-white dark:bg-neutral-700"
            />
          </div>

          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            선택 범위: {seYearsCount}년
          </div>
        </div>
      )}

      {multiTab === "월운" && (
        <div>
          <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            월운 범위 (최대 12개월)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={wolStartDate}
              onChange={(e) => onWolStartChange(e.target.value)}
              onBlur={onWolStartBlur}
              className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
            />
            <span className="text-xs">~</span>
            <input
              type="month"
              value={wolEndDate}
              onChange={(e) => onWolEndChange(e.target.value)}
              onBlur={onWolEndBlur}
              className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
            />
          </div>

          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            선택 범위: {wolMonthsCount}개월
          </div>
        </div>
      )}

      {multiTab === "일운" && (
        <div>
          <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            일운 범위 (최대 30일)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={ilStartDate}
              onChange={(e) => onIlStartChange(e.target.value)}
              onBlur={onIlStartBlur}
              className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
            />
            <span className="text-xs">~</span>
            <input
              type="date"
              value={ilEndDate}
              onChange={(e) => onIlEndChange(e.target.value)}
              onBlur={onIlEndBlur}
              className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
            />
          </div>

          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
            선택 범위: {ilDaysCount}일
          </div>
        </div>
      )}

      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        <p>선택한 {multiTab}의 데이터가 프롬프트에 포함됩니다.</p>
        <p>필요하면 탭마다 값을 별도로 조정하세요.</p>
      </div>
    </div>
  );
}
