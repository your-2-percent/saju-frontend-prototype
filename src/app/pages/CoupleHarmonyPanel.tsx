import { type Pillars4 } from "@/analysisReport/calc/logic/relations";
import { buildCoupleHarmonyTags_AB  } from "@/analysisReport/calc/logic/relations";

/** 
 * NOTE: HarmonyResult, toArr, buildCoupleHarmonyTags have been moved to 
 * src/features/AnalysisReport/logic/coupleHarmony.ts for Fast Refresh compatibility.
 */

export default function CoupleHarmonyPanel({
  pillarsA,
  pillarsB,
}: {
  pillarsA: Pillars4;
  pillarsB: Pillars4;
}) {
  const tags = buildCoupleHarmonyTags_AB(pillarsA, pillarsB);

  return (
    <div className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-2">
      <div className="text-sm font-bold mb-3">두 명식 간 형충회합</div>

      {Object.entries(tags).map(([key, vals]) =>
        vals.length > 0 ? (
          <div key={key} className="flex gap-2 text-xs">
            <span className="shrink-0 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-400 mt-1">{key}</span>
            <div className="flex flex-wrap gap-2">
              {vals.map((t, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full border whitespace-nowrap bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
