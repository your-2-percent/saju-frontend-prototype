import type { RelationMode } from "@/features/prompt/buildPrompt";
import type { PartnerOption } from "@/promptCopy/calc/types";

type Props = {
  visible: boolean;
  relationMode: RelationMode;
  setRelationMode: (mode: RelationMode) => void;
  partnerId: string;
  setPartnerId: (id: string) => void;
  partnerOptions: PartnerOption[];
};

export default function RelationSelectors({
  visible,
  relationMode,
  setRelationMode,
  partnerId,
  setPartnerId,
  partnerOptions,
}: Props) {
  if (!visible) return null;

  return (
    <div className="flex flex-col gap-1.5 text-[11px] text-neutral-700 dark:text-neutral-200">
      <div className="flex items-center gap-2">
        <span className="font-semibold">관계 기준</span>
        <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setRelationMode("solo")}
            className={`px-3 py-1 cursor-pointer ${
              relationMode === "solo"
                ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            }`}
          >
            단일 기준
          </button>
          <button
            type="button"
            onClick={() => setRelationMode("couple")}
            className={`px-3 py-1 cursor-pointer ${
              relationMode === "couple"
                ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            }`}
          >
            커플 기준
          </button>
        </div>
      </div>

      {relationMode === "couple" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">상대 명식 선택</span>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="min-w-[180px] h-30 px-2 py-1 border rounded bg-white dark:bg-neutral-800"
          >
            <option value="">선택 없음</option>
            {partnerOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
