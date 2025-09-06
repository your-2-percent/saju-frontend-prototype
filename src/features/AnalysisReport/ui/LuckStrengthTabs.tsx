// features/AnalysisReport/ui/LuckStrengthTabs.tsx
import { useMemo } from "react";
import type { Element } from "../utils/types";
import { blendElementStrength, type BlendTab, /*BLEND_WEIGHTS*/ } from "../logic/blend";

export default function LuckStrengthTabs({
  natalElementScore,
  daewoonGz,
  sewoonGz,
  wolwoonGz,
  blendTab,
  onTabChange,
}: {
  natalElementScore: Record<Element, number>;
  daewoonGz?: string | null;
  sewoonGz?: string | null;
  wolwoonGz?: string | null;
  blendTab: BlendTab;
  onTabChange: (t: BlendTab) => void;
}) {

  //const [tab, setTab] = useState<BlendTab>("원국만");

  const mixed = useMemo(
    () => blendElementStrength({ natalElementScore, daewoonGz, sewoonGz, wolwoonGz, tab: blendTab }),
    [natalElementScore, daewoonGz, sewoonGz, wolwoonGz, blendTab]
  );

  const tabs: BlendTab[] = ["원국","대운","세운","월운"];

  // 실제 반영된 가중치 안내(존재하는 운만 재정규화됨)
  /*const weightsLabel = useMemo(() => {
    const w = BLEND_WEIGHTS[tab];
    const pairs: Array<[string, number | undefined, boolean]> = [
      ["원국", w.natal, true],
      ["대운", w.dae, !!daewoonGz],
      ["세운", w.se, !!sewoonGz],
      ["월운", w.wol, !!wolwoonGz],
    ];
    const used = pairs.filter(([, val, ok]) => (val ?? 0) > 0 && ok);
    const sum = used.reduce((s,[,v])=>s+(v ?? 0), 0) || 1;
    return used
      .map(([label, val]) => `${label} ${Math.round(((val ?? 0)/sum)*100)}%`)
      .join(" + ");
  }, [tab, daewoonGz, sewoonGz, wolwoonGz]);*/

  const detailLabel = useMemo(() => {
    return `(${[
      `대운 ${daewoonGz ?? "-"}`,
      `세운 ${sewoonGz ?? "-"}`,
      `월운 ${wolwoonGz ?? "-"}`
    ].join(", ")})`;
  }, [daewoonGz, sewoonGz, wolwoonGz]);


  return (
    <div
      className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3"
      key={`${daewoonGz ?? ""}|${sewoonGz ?? ""}|${wolwoonGz ?? ""}|${blendTab}`}
    >
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            aria-pressed={blendTab===t}
            className={
              "px-2 py-1 text-xs rounded border " +
              (blendTab===t
                ? "bg-yellow-500 text-black border-yellow-600"
                : "bg-neutral-900 text-neutral-300 border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
        <span className="ml-2 text-[11px] text-neutral-500">
          <span className="ml-2 text-[11px] text-neutral-500">{detailLabel}</span>
        </span>
        {blendTab!=="원국" && (
          <span className="ml-2 text-[11px] text-neutral-500 opacity-80">
            (대운 {daewoonGz ?? "-"}, 세운 {sewoonGz ?? "-"}, 월운 {wolwoonGz ?? "-"})
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(["목","화","토","금","수"] as Element[]).map(el => (
          <div key={el} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-400 mb-1">{el}</div>
            <div className="h-2 w-full bg-neutral-300 dark:bg-neutral-800 rounded overflow-hidden">
              <div
                className="h-2 bg-white dark:bg-neutral-100"
                style={{ width: `${mixed[el]}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-neutral-500">{mixed[el].toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
