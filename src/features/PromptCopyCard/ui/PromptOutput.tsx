type Props = {
  value: string;
  lockSelection?: boolean;
};

export default function PromptOutput({ value, lockSelection = false }: Props) {
  if (lockSelection) {
    return (
      <div
        className="w-full h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2 select-none flex items-center justify-center text-center text-neutral-500"
        aria-readonly="true"
      >
        프리미엄 기능이므로, 관리자에게 문의하세요.
      </div>
    );
  }

  return (
    <textarea
      readOnly
      value={value}
      placeholder="프롬프트 결과가 여기 표시됩니다."
      className="w-full h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2 overflow-y-auto resize-none"
    />
  );
}
