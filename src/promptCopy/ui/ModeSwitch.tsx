type Props = {
  isMultiMode: boolean;
  setIsMultiMode: (next: boolean) => void;
  canUseMultiMode: boolean;
};

export default function ModeSwitch({ isMultiMode, setIsMultiMode, canUseMultiMode }: Props) {
  const multiLocked = !canUseMultiMode;

  return (
    <div className="grid grid-cols-2 p-1 gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <button
        type="button"
        onClick={() => setIsMultiMode(false)}
        className={`flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
          !isMultiMode
            ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        }`}
      >
        단일 시점 (특정 날짜)
      </button>

      <button
        type="button"
        onClick={() => setIsMultiMode(true)}
        disabled={multiLocked}
        title={multiLocked ? "프리미엄 기능입니다." : "멀티 시점 (운의 흐름)"}
        className={`flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${
          multiLocked
            ? "text-neutral-400 cursor-not-allowed opacity-50"
            : isMultiMode
            ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm cursor-pointer"
            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
        }`}
      >
        멀티 시점 (운의 흐름) {multiLocked ? "🔒" : ""}
      </button>
    </div>
  );
}
