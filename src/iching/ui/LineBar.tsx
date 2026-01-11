import type { YinYang } from "@/iching/calc/ichingTypes";

type Props = {
  yinYang: YinYang;
  changing: boolean;
  onClick?: () => void;
  showChanging?: boolean;
};

export default function LineBar({ yinYang, changing, onClick, showChanging = true }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full select-none",
        "rounded-xl px-3 py-2",
        "border border-neutral-200 dark:border-neutral-800",
        "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800",
        "flex items-center gap-3",
        onClick ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      title={onClick ? "클릭해서 효값 순환(6→7→8→9)" : undefined}
    >
      <div className="flex-1">
        {yinYang === 1 ? (
          <div className="h-3 rounded bg-neutral-900 dark:bg-neutral-100" />
        ) : (
          <div className="flex gap-2">
            <div className="h-3 flex-1 rounded bg-neutral-900 dark:bg-neutral-100" />
            <div className="h-3 flex-1 rounded bg-neutral-900 dark:bg-neutral-100" />
          </div>
        )}
      </div>

      {showChanging && (
        <div className="w-8 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {changing ? "변" : ""}
        </div>
      )}
    </button>
  );
}
