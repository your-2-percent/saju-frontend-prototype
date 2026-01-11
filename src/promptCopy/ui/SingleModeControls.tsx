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
    <>
      <div className="flex desk:justify-between flex-col desk:flex-row gap-2">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => {
            const locked = !canUseLuckTabs && t !== "원국";
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
                title={locked ? "프리미엄 기능입니다." : t}
                className={[
                  "px-2 py-1 text-xs rounded-md border transition-colors",
                  locked
                    ? "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed opacity-70"
                    : "cursor-pointer",
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                    : !locked
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      : "",
                ].join(" ")}
              >
                {t} {locked ? "🔒" : ""}
              </button>
            );
          })}
        </div>

        <DateInput date={date} onChange={setDate} />
      </div>

      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        <p>아래에서 날짜를 조정하면 해당 시점의 운이 적용됩니다.</p>
        <p>운 탭에 따라 기준 간지가 바뀝니다.</p>
        <p>프롬프트 복사 전에도 설정을 변경할 수 있습니다.</p>
      </div>
    </>
  );
}
