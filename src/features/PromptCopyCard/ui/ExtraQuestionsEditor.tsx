import type { ChangeEventHandler, MouseEventHandler } from "react";

type Props = {
  questionDraft: string;
  onChangeDraft: ChangeEventHandler<HTMLTextAreaElement>;
  onAddQuestion: MouseEventHandler<HTMLButtonElement>;
  extraQuestions: string[];
  onClearAll: MouseEventHandler<HTMLButtonElement>;
  onRemoveQuestion: (idx: number) => void;
  locked?: boolean;
  lockTitle?: string;
};

export default function ExtraQuestionsEditor({
  questionDraft,
  onChangeDraft,
  onAddQuestion,
  extraQuestions,
  onClearAll,
  onRemoveQuestion,
  locked = false,
  lockTitle,
}: Props) {
  const lockLabel = lockTitle ? " 🔒" : "";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
          추가 질문 입력 (선택)
        </div>
        {extraQuestions.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={locked}
            title={locked ? lockTitle : undefined}
            className="px-2 py-1 text-[10px] rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-300 cursor-pointer"
          >
            전체 삭제
          </button>
        )}
      </div>

      <textarea
        value={questionDraft}
        onChange={onChangeDraft}
        readOnly={locked}
        disabled={locked}
        title={locked ? lockTitle : undefined}
        placeholder="여기에 AI에게 추가로 물어보고 싶은 내용을 적고, '질문 추가' 버튼을 눌러주세요."
        rows={3}
        className="w-full placeholder:text-xs text-[16px] desk:text-xs rounded-md border bg-white dark:bg-neutral-800 p-2"
      />

      <div className="mb-4 text-center">
        <button
          type="button"
          onClick={onAddQuestion}
          disabled={locked}
          title={locked ? lockTitle : undefined}
          className={[
            "w-full desk:max-w-[160px] px-1 py-1.5 text-xs rounded-md border",
            locked
              ? "cursor-not-allowed opacity-50 bg-neutral-400 text-white dark:bg-neutral-700"
              : "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black cursor-pointer",
          ].join(" ")}
        >
          {locked ? `질문 추가${lockLabel}` : "질문 추가"}
        </button>

        {extraQuestions.length > 0 && (
          <div className="flex-1 text-[11px] text-neutral-500 dark:text-neutral-400 text-right">
            추가 질문 {extraQuestions.length}개
          </div>
        )}
      </div>

      {extraQuestions.length > 0 && (
        <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto text-[11px] text-neutral-700 dark:text-neutral-200">
          {extraQuestions.map((q, idx) => (
            <li key={idx} className="flex gap-1 items-start">
              <span className="shrink-0">{idx + 1}.</span>
              <span className="whitespace-pre-wrap break-words flex-1">{q}</span>
              <button
                type="button"
                onClick={() => onRemoveQuestion(idx)}
                disabled={locked}
                title={locked ? lockTitle : undefined}
                className={[
                  "shrink-0 ml-2 text-[10px]",
                  locked ? "text-neutral-400 cursor-not-allowed" : "text-red-500 hover:underline",
                ].join(" ")}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
