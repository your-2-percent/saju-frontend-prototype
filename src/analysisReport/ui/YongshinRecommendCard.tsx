// features/AnalysisReport/YongshinRecommendCard.tsx
import type { MyeongSik } from "@/shared/lib/storage";
import type { YongshinMultiResult, YongshinGroup, YongshinItem } from "@/analysisReport/calc/yongshin/multi";
import { useLuckYongshin } from "@/analysisReport/calc/yongshin/useLuckYongshin";
import YongshinLuckDiffPanel from "@/analysisReport/ui/YongshinLuckDiffPanel";

type Props = {
  /** ✅ 원국(기본) 용신 */
  recommend: YongshinMultiResult;
  /** ✅ 운용신 계산용 */
  data: MyeongSik;
  pillars: [string, string, string, string];
  hourKey: string;

  demoteAbsent: boolean;
  hiddenStemMode: string;
};

function pctWidth(score: number, maxScore: number): string {
  if (maxScore <= 0) return "12%";
  const w = Math.round((score / maxScore) * 100);
  return `${Math.max(2, Math.min(100, w))}%`;
}

function pickTop3(candidates: YongshinItem[]): YongshinItem[] {
  return candidates.slice(0, 3);
}

const Chip: React.FC<{ text: string; tone?: "base" | "best" }> = ({ text, tone = "base" }) => {
  const cls =
    tone === "best"
      ? "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border border-transparent ${cls}`}>{text}</span>;
};

function GroupDetails({ g, isBest }: { g: YongshinGroup; isBest: boolean }) {
  const top3 = pickTop3(g.candidates);

  return (
    <details
      open={isBest}
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <summary className="list-none cursor-pointer px-3 py-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            {g.marker} {g.title}
          </span>

          {/* ✅ 말줄임 제거: truncate 제거 + 줄바꿈 허용 */}
          <span className="max-w-[62%] text-xs text-neutral-600 dark:text-neutral-400 whitespace-normal break-words">
            {g.note}
          </span>

          {!g.applicable && <Chip text="조건 미충족" />}

          {isBest && <Chip text="최종 선택" tone="best" />}

          <Chip text={`적합도 ${g.fitScore}`} />
        </div>
      </summary>

      <div className="px-3 pb-3 pt-1">
        {top3.length === 0 ? (
          <div className="text-xs text-neutral-600 dark:text-neutral-400">후보 없음</div>
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
}

function BestSummary({ best }: { best: YongshinGroup | null }) {
  const top = best?.candidates?.[0] ?? null;

  return (
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

        {top?.element ? <Chip text={`1순위: ${top.element}`} /> : null}
        {best?.fitScore != null ? <Chip text={`적합도 ${best.fitScore}`} /> : null}
      </div>

      {best?.note ? (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-normal break-words">
          {best.note}
        </div>
      ) : null}
    </div>
  );
}

export function YongshinRecommendCard({ recommend, data, pillars, hourKey, demoteAbsent, hiddenStemMode }: Props) {
  const natal = recommend;

  // ✅ 운용신(대운/세운) 계산은 hook으로 빼서 카드 얇게
  const luck = useLuckYongshin({
    data,
    pillars,
    hourKey,
    demoteAbsent,
    hiddenStemMode,
  });

  return (
    <div className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-4">
      {/* 원국 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">용신 추천 (원국)</div>
          {luck.hasAbsent ? (
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              * 원국 부재 있음{demoteAbsent ? " (부재후순위 ON)" : ""}
            </span>
          ) : null}
        </div>

        <BestSummary best={natal.best} />

        <div className="space-y-2">
          {natal.groups.map((g) => (
            <GroupDetails key={g.kind} g={g} isBest={natal.bestKind === g.kind} />
          ))}
        </div>
      </div>

      <YongshinLuckDiffPanel
        data={data}
        pillars={pillars}
        hourKey={hourKey}
        demoteAbsent={demoteAbsent}
        natal={recommend}
      />
    </div>
  );
}
