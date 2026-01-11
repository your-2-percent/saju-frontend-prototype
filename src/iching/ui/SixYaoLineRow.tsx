type YinYang = 0 | 1;

type Props = {
  indexTopDown: number;
  yinYang: YinYang;
  isChanging: boolean;
};

export default function SixYaoLineRow({ indexTopDown, yinYang, isChanging }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-right text-xs text-neutral-600 dark:text-neutral-400">{indexTopDown}효</div>
      <div className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        {yinYang === 1 ? (
          <div className="h-2 rounded bg-neutral-900 dark:bg-neutral-100" />
        ) : (
          <div className="flex gap-2">
            <div className="h-2 flex-1 rounded bg-neutral-900 dark:bg-neutral-100" />
            <div className="h-2 flex-1 rounded bg-neutral-900 dark:bg-neutral-100" />
          </div>
        )}
      </div>
      <div className="w-10 text-right text-xs text-neutral-600 dark:text-neutral-400">{isChanging ? "변" : ""}</div>
    </div>
  );
}
