import type { BlendTab } from "@/analysisReport/calc/logic/blend";
import DateInput from "@/luck/ui/DateTimePicker";

type Props = {
  tabs: BlendTab[];
  activeTab: BlendTab;
  setActiveTab: (tab: BlendTab) => void;
  date: Date;
  setDate: (d: Date) => void;
  canUseLuckTabs: boolean;
};

export default function SingleModeControls({
  tabs,
  activeTab,
  setActiveTab,
  date,
  setDate,
  canUseLuckTabs,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-x-auto">
        {tabs.map((t, idx) => {
          const isNatalTab = idx === 0;
          const locked = !canUseLuckTabs && !isNatalTab;
          const isActive = !locked && activeTab === t;

          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (locked) return;
                setActiveTab(t);
              }}
              disabled={locked}
              title={locked ? "프리 플랜 기능" : t}
              className={[
                "flex-1 min-w-[50px] px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                locked
                  ? "text-neutral-400 cursor-not-allowed opacity-50"
                  : "cursor-pointer",
                isActive
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black shadow-sm"
                  : !locked
                  ? "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  : "",
              ].join(" ")}
            >
              {t} {locked ? "(잠김)" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col desk:flex-row desk:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-100 dark:border-neutral-800">
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5">
          <p>📅 날짜를 바꾸면 해당 시점의 운이 반영됩니다.</p>
          <p>💡 탭 변경 후에도 프롬프트에 적용돼요.</p>
        </div>
        <div className="shrink-0">
          <DateInput date={date} onChange={setDate} />
        </div>
      </div>
    </div>
  );
}
