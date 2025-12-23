// features/AnalysisReport/components/YongshinRecommendCard.tsx
import type { YongshinMultiResult } from "@/features/AnalysisReport/calc/yongshin/multi";

type Props = {
  yongshin: YongshinMultiResult;
  hasAbsent: boolean;
  demoteAbsent: boolean;
  onToggleDemoteAbsent: () => void;
};

function pctWidth(score: number, maxScore: number): string {
  if (maxScore <= 0) return "12%";
  const w = Math.round((score / maxScore) * 100);
  return `${Math.max(2, Math.min(100, w))}%`;
}

export default function YongshinRecommendCard({
  yongshin,
  hasAbsent,
  demoteAbsent,
  onToggleDemoteAbsent,
}: Props) {
  const best = yongshin.best;

  return (
    <div className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">용신 추천</div>

        {hasAbsent && (
          <button
            type="button"
            onClick={onToggleDemoteAbsent}
            className={`text-xs px-2 py-1 rounded-lg border transition cursor-pointer
              ${
                demoteAbsent
                  ? "bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
              }`}
            aria-pressed={demoteAbsent}
          >
            부재후순위: {demoteAbsent ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {/* 최종 추천 요약 */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-white/60 dark:bg-neutral-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            최종 기준
          </span>
          <div className="text-sm font-semibold">
            {best ? (
              <>
                <span className="mr-1">{best.marker}</span>
                {best.title}
              </>
            ) : (
              "—"
            )}
          </div>

          {best?.candidates?.[0]?.element ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              1순위: {best.candidates[0].element}
            </span>
          ) : null}

          {best?.fitScore ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              적합도 {best.fitScore}
            </span>
          ) : null}
        </div>

        {best?.note ? (
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {best.note}
          </div>
        ) : null}
      </div>

      {/* 타입별 */}
      <div className="space-y-2">
        {yongshin.groups.map((g) => {
          const isBest = best?.kind === g.kind;
          const top3 = g.candidates.slice(0, 3);

          return (
            <details
              key={g.kind}
              open={isBest}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            >
              <summary className="list-none cursor-pointer px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex flex-col desk:flex-row flex-wrap items-start gap-2 flex-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    {g.marker} {g.title}
                  </span>

                  <div className="flex items-center flex-1 gap-2">
                    {/* ✅ 말줄임 제거 + 자동 줄바꿈 */}
                    <span className="desk:max-w-[70%] text-xs text-neutral-600 dark:text-neutral-400">
                      {g.note}
                    </span>

                    {!g.applicable && (
                      <span className="text-nowrap text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        조건 미충족
                      </span>
                    )}

                    {isBest && (
                      <span className="text-nowrap text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800">
                        최종 선택
                      </span>
                    )}
                  </div>
                </div>


                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    최종점수 {g.finalScore}
                  </span>
                </div>
              </summary>

              <div className="px-3 pb-3 pt-1">
                {top3.length === 0 ? (
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    후보 없음
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {top3.map((it, idx) => (
                      <li
                        key={`${g.kind}-${it.elNorm ?? it.element}-${idx}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                            {idx + 1}위
                          </span>
                          <span className="text-sm font-semibold">{it.element}</span>
                        </div>

                        <div className="flex-1">
                          <div className="mt-1 h-1.5 w-full rounded bg-neutral-300 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className="h-1.5 rounded bg-white dark:bg-neutral-100"
                              style={{ width: pctWidth(it.score ?? 0, g.maxScore) }}
                              title={`점수 ${it.score}`}
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(it.reasons ?? []).slice(0, 6).map((r, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
