import { useState } from "react";

type Props = {
  value: string;
  lockSelection?: boolean;
};

export default function PromptOutput({ value, lockSelection = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (lockSelection) {
    return (
      <div
        className="w-full h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2 select-none flex items-center justify-center text-center text-neutral-500"
        aria-readonly="true"
      >
        프리미엄 기능으로 관리자에게 문의하세요
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <textarea
          readOnly
          value={value}
          placeholder="프롬프트 결과가 여기 표시됩니다"
          className={[
            "w-full text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2 resize-none transition-[height] duration-200",
            "desk:h-[270px] desk:overflow-y-auto",
            expanded ? "h-[270px] overflow-y-auto pointer-events-auto" : "h-[150px] overflow-hidden pointer-events-none",
          ].join(" ")}
        />

        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-md bg-gradient-to-t from-white/95 dark:from-neutral-800/95 to-transparent" />
        )}
      </div>

      <div className="mt-2 mb-3 flex justify-center desk:hidden">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="px-3 py-1 rounded-full border text-xs bg-white text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      </div>
    </div>
  );
}
