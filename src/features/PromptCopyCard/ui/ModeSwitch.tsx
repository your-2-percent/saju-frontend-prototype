type Props = {
  isMultiMode: boolean;
  setIsMultiMode: (next: boolean) => void;
  canUseMultiMode: boolean;
};

export default function ModeSwitch({ isMultiMode, setIsMultiMode, canUseMultiMode }: Props) {
  const multiLocked = !canUseMultiMode;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setIsMultiMode(false)}
        className={`px-3 py-1.5 text-xs rounded-md border cursor-pointer ${
          !isMultiMode
            ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
        }`}
      >
        단일 모드
      </button>

      <button
        type="button"
        onClick={() => setIsMultiMode(true)}
        disabled={multiLocked}
        title={multiLocked ? "프리미엄 기능입니다." : "멀티모드 (여러 시점 입력)"}
        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
          multiLocked
            ? "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed opacity-70"
            : isMultiMode
              ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black cursor-pointer"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
        }`}
      >
        멀티모드 (여러 시점 입력) {multiLocked ? "🔒" : ""}
      </button>
    </div>
  );
}
