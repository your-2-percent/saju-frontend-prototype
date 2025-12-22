import type { PromptCopySections } from "@/features/PromptCopyCard/promptCopySectionsStore";

type Props = {
  sections: PromptCopySections;
  toggleSection: (key: keyof PromptCopySections) => void;
};

export default function PromptSectionsToggle({ sections, toggleSection }: Props) {
  return (
    <div className="mt-3 border-t pt-2">
      <div className="text-[11px] font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
        프롬프트 포함 데이터 <span className="text-amber-500">(TIP.현재 구글 제미나이에서 제일 훌륭히 작동합니다. - 2025/12월 기준)</span>
      </div>

      <div className="grid grid-cols-5 desk:grid-cols-8 gap-2 text-[11px] text-neutral-700 dark:text-neutral-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sections.twelveUnseong}
            onChange={() => toggleSection("twelveUnseong")}
            className="w-3 h-3"
          />
          십이운성
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sections.twelveShinsal}
            onChange={() => toggleSection("twelveShinsal")}
            className="w-3 h-3"
          />
          십이신살
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sections.shinsal}
            onChange={() => toggleSection("shinsal")}
            className="w-3 h-3"
          />
          기타 신살
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sections.nabeum}
            onChange={() => toggleSection("nabeum")}
            className="w-3 h-3"
          />
          납음오행
        </label>
      </div>
    </div>
  );
}
