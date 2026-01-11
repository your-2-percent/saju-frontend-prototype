import type { PromptCopySections } from "@/promptCopy/input/promptCopySectionsStore";

type Props = {
  sections: PromptCopySections;
  toggleSection: (key: keyof PromptCopySections) => void;
};

export default function PromptSectionsToggle({ sections, toggleSection }: Props) {
  return (
    <div className="mt-3 border-t pt-2">
      <div className="text-[11px] font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
       <p>프롬프트 포함 데이터 <span className="text-amber-500">(TIP.프롬프트를 복사하여 AI에 붙여넣고 질문하세요. ex.챗지피티, 제미나이 등)</span></p>
       <p className="text-amber-500">※ 이 기능은 프롬프트 사주적인 데이터만 제공합니다. (프롬프트 사용에 대한 책임은 본인에게 있습니다.)</p>
       <p className="text-amber-500">※ AI는 충분히 틀린말을 할 수 있습니다. 필터링 하여, 정보를 받아들이셔야 합니다.</p>
       <p className="text-amber-500">※ 전적으로 AI를 믿기보다는, 공부용으로 딱 사용하시면 좋습니다. 참고용으로만 받아들이세요.</p>
      </div>

      <div className="grid grid-cols-4 desk:grid-cols-8 gap-2 text-[11px] text-neutral-700 dark:text-neutral-200">
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
