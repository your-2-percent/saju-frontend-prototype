import { useMemo } from "react";
import LineBar from "@/iching/ui/LineBar";
import type { LineDraw } from "@/iching/calc/ichingTypes";
import { isChanging, lineLabel, toChangedYinYang, toYinYang } from "@/iching/calc/ichingDrawerUtils";

type Props = {
  title: string;
  linesBottomUp: readonly LineDraw[];
  isChanged: boolean;
  onEditLine?: (indexBottomUp: number) => void;
};

export default function HexagramView({ title, linesBottomUp, isChanged, onEditLine }: Props) {
  const bits = useMemo(() => {
    const f = isChanged
      ? (ld: LineDraw) => toChangedYinYang(ld.value)
      : (ld: LineDraw) => toYinYang(ld.value);
    return linesBottomUp.map(f);
  }, [isChanged, linesBottomUp]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            비트(하→상): <span className="font-mono">{bits.join("")}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {[5, 4, 3, 2, 1, 0].map((i) => {
          const ld: LineDraw = linesBottomUp[i] ?? { value: 7, source: "manual" };
          const yy = isChanged ? toChangedYinYang(ld.value) : toYinYang(ld.value);
          const changing = isChanging(ld.value);
          const canEdit = Boolean(onEditLine) && !isChanged;
          const coinText =
            ld.source === "coin" && ld.coins
              ? `${ld.coins[0]}-${ld.coins[1]}-${ld.coins[2]}`
              : ld.source === "manual"
              ? "수동"
              : "";

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 text-right text-xs text-neutral-600 dark:text-neutral-400">{i + 1}효</div>
              <div className="flex-1">
                <LineBar yinYang={yy} changing={changing} onClick={canEdit ? () => onEditLine?.(i) : undefined} />
              </div>
              <div className="w-10 text-xs text-neutral-700 dark:text-neutral-300">
                {!isChanged ? (
                  <div className="flex flex-col items-end">
                    <div>{lineLabel(ld.value)}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{coinText}</div>
                  </div>
                ) : (
                  ""
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
