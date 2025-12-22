import type { MouseEventHandler } from "react";

type Props = {
  copiedInfo: boolean;
  copiedAll: boolean;
  canCopyInfo: boolean;
  canCopyAll: boolean;
  lockTitle?: string;
  onCopyInfoOnly: MouseEventHandler<HTMLButtonElement>;
  onCopyAll: MouseEventHandler<HTMLButtonElement>;
};

export default function PromptCopyHeader({
  copiedInfo,
  copiedAll,
  canCopyInfo,
  canCopyAll,
  lockTitle,
  onCopyInfoOnly,
  onCopyAll,
}: Props) {
  const lockLabel = lockTitle ? " 🔒" : "";
  return (
    <div className="flex flex-col desk:flex-row desk:items-center desk:justify-between gap-2">
      <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        AI 프롬프트 출력
      </div>

      <div className="flex gap-2 w-full desk:w-auto">
        <button
          type="button"
          onClick={onCopyInfoOnly}
          disabled={!canCopyInfo}
          title={!canCopyInfo ? lockTitle : undefined}
          className={[
            "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap border",
            canCopyInfo ? "cursor-pointer" : "cursor-not-allowed opacity-50",
            copiedInfo
              ? "bg-green-600 text-white border-green-600"
              : canCopyInfo
              ? "bg-orange-600 text-white dark:bg-orange-600"
              : "bg-orange-600/70 text-white border-orange-600/50",
          ].join(" ")}
        >
          {copiedInfo ? "복사됨" : `명식 정보만 복사${!canCopyInfo ? lockLabel : ""}`}
        </button>

        <button
          type="button"
          onClick={onCopyAll}
          disabled={!canCopyAll}
          title={!canCopyAll ? lockTitle : undefined}
          className={[
            "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap",
            canCopyAll ? "cursor-pointer" : "cursor-not-allowed opacity-50",
            copiedAll
              ? "bg-green-600 text-white"
              : "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black",
          ].join(" ")}
        >
          {copiedAll ? "복사됨" : `전체 프롬프트 복사${!canCopyAll ? lockLabel : ""}`}
        </button>
      </div>
    </div>
  );
}
