import type { PromptCopySections } from "@/promptCopy/input/promptCopySectionsStore";
import { useSettingsStore } from "@/settings/input/useSettingsStore";

type Props = {
  sections: PromptCopySections;
  toggleSection: (key: keyof PromptCopySections) => void;
};

export default function PromptSectionsToggle({ sections, toggleSection }: Props) {
  const daewoonDisplayBase = useSettingsStore((s) => s.settings.daewoonDisplayBase);
  const setSettingsKey = useSettingsStore((s) => s.setKey);

  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-[11px] font-semibold mb-3 text-neutral-700 dark:text-neutral-200 space-y-0.5">
       <p>프롬프트 포함 데이터 <span className="text-amber-500">(TIP.프롬프트를 복사하여 AI에 붙여넣고 질문하세요. ex.챗지피티, 제미나이 등)</span></p>
       <p className="text-amber-500">※ 이 기능은 프롬프트 사주적인 데이터만 제공합니다. (프롬프트 사용에 대한 책임은 본인에게 있습니다.)</p>
       <p className="text-amber-500">※ AI는 충분히 틀린말을 할 수 있습니다. 필터링 하여, 정보를 받아들이셔야 합니다.</p>
       <p className="text-amber-500">※ 전적으로 AI를 믿기보다는, 공부용으로 딱 사용하시면 좋습니다. 참고용으로만 받아들이세요.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "twelveUnseong", label: "십이운성" },
            { key: "twelveShinsal", label: "십이신살" },
            { key: "shinsal", label: "기타 신살" },
            { key: "nabeum", label: "납음오행" },
          ] as const
        ).map((item) => {
          const isChecked = sections[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSection(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium rounded-full border transition-all cursor-pointer ${
                isChecked
                  ? "bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-black shadow-sm"
                  : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              }`}
            >
              <span className={isChecked ? "" : "hidden"}>✓</span>
              {item.label} 포함
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">대운 기준</span>
        <div className="inline-flex rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setSettingsKey("daewoonDisplayBase", "정밀기준")}
            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
              daewoonDisplayBase === "정밀기준"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                : "bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            정밀대운
          </button>
          <button
            type="button"
            onClick={() => setSettingsKey("daewoonDisplayBase", "표준기준")}
            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
              daewoonDisplayBase === "표준기준"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                : "bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            표준대운
          </button>
        </div>
      </div>
    </div>
  );
}
