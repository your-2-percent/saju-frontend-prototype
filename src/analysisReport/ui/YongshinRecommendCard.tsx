
import type { MyeongSik } from "@/shared/lib/storage";
import type { YongshinMultiResult, YongshinGroup } from "@/analysisReport/calc/yongshin/multi";
import { useLuckYongshin } from "@/analysisReport/calc/yongshin/useLuckYongshin";
import YongshinLuckDiffPanel from "@/analysisReport/ui/YongshinLuckDiffPanel";

type Props = {
  recommend: YongshinMultiResult;
  data: MyeongSik;
  pillars: [string, string, string, string];
  hourKey: string;
  demoteAbsent: boolean;
  onDemoteAbsentChange?: (next: boolean) => void;
  hasAbsent?: boolean;
  hiddenStemMode: string;
};

// --- 공통 UI 컴포넌트 ---

const Badge = ({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "neutral" | "violet" | "amber" | "indigo" }) => {
  const styles = {
    neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-sm ${styles[variant]}`}>
      {children}
    </span>
  );
};

function pctWidth(score: number, maxScore: number): string {
  if (maxScore <= 0) return "12%";
  const w = Math.round((score / maxScore) * 100);
  return `${Math.max(5, Math.min(100, w))}%`;
}

// --- 서브 섹션 컴포넌트 ---

function GroupDetails({
  g,
  isBest,
  demoteAbsent,
  hasAbsent,
  onDemoteAbsentChange,
}: {
  g: YongshinGroup;
  isBest: boolean;
  demoteAbsent: boolean;
  hasAbsent: boolean;
  onDemoteAbsentChange?: (next: boolean) => void;
}) {
  const top3 = g.candidates.slice(0, 3);

  return (
    <details
      open={isBest}
      className={`group rounded-2xl border transition-all duration-300 ${
        isBest 
          ? "border-violet-200 dark:border-violet-800 bg-white dark:bg-neutral-900 shadow-md" 
          : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50"
      }`}
    >
      <summary className="list-none cursor-pointer p-4 select-none">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isBest ? "font-black text-violet-600" : "font-bold text-neutral-700 dark:text-neutral-300"}`}>
                {g.marker} {g.title}
              </span>
              {isBest && <Badge variant="violet">최종 채택</Badge>}
              {!g.applicable && <Badge variant="neutral">미충족</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-400">적합도</span>
              <span className="text-sm font-black text-neutral-800 dark:text-neutral-100">{g.fitScore}</span>
              <span className="text-neutral-300 group-open:rotate-180 transition-transform">▼</span>
            </div>
          </div>
          
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-normal break-words pr-4">
            {g.note}
          </p>
        </div>
      </summary>

      <div className="px-4 pb-4 space-y-3">
        {top3.length === 0 ? (
          <div className="text-[11px] text-neutral-400 py-2 text-center border-t border-neutral-100 dark:border-neutral-800">추천 후보가 없습니다.</div>
        ) : (
          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            {top3.map((it, idx) => (
              <div
                key={`${g.kind}-${it.element}-${idx}`}
                className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex flex-col items-center justify-center min-w-[40px]">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">{idx + 1}st</span>
                  <span className="text-sm font-black text-neutral-800 dark:text-neutral-100">{it.element}</span>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isBest ? "bg-gradient-to-r from-violet-400 to-indigo-500" : "bg-neutral-400"
                      }`}
                      style={{ width: pctWidth(it.score ?? 0, g.maxScore) }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(it.reasons ?? []).slice(0, 4).map((r, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-600 shadow-sm">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasAbsent && (
          <button
            type="button"
            onClick={() => onDemoteAbsentChange?.(!demoteAbsent)}
            className={`px-2 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
              demoteAbsent
                ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                : "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
            }`}
            aria-pressed={demoteAbsent}
          >
            부재후순위 {demoteAbsent ? "ON" : "OFF"}
          </button>
        )}
      </div>
    </details>
  );
}

function BestSummary({ best }: { best: YongshinGroup | null }) {
  const top = best?.candidates?.[0] ?? null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-violet-200 dark:border-violet-800 p-6 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-neutral-900 shadow-sm">
      {/* 배경 데코레이션 */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-100 dark:bg-violet-900/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge variant="indigo">베스트 추천</Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">적합도 점수</span>
            <span className="text-lg font-black text-violet-600 dark:text-violet-400">{best?.fitScore ?? 0}</span>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <h4 className="text-2xl font-black text-neutral-800 dark:text-neutral-100 tracking-tighter">
            {best ? `${best.marker} ${best.title}` : "분석 결과 없음"}
          </h4>
          {top?.element && (
            <div className="mb-1 flex items-center gap-1">
              <span className="text-xs text-neutral-400 font-medium">제1용신:</span>
              <span className="text-base font-black text-indigo-500">{top.element}</span>
            </div>
          )}
        </div>

        {best?.note && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
            {best.note}
          </p>
        )}
      </div>
    </div>
  );
}

// --- 메인 카드 ---

export function YongshinRecommendCard({
  recommend,
  data,
  pillars,
  hourKey,
  demoteAbsent,
  onDemoteAbsentChange,
  hasAbsent,
  hiddenStemMode,
}: Props) {
  const luck = useLuckYongshin({ data, pillars, hourKey, demoteAbsent, hiddenStemMode });
  const hasAbsentUi = hasAbsent ?? luck.hasAbsent;

  return (
    <div className="w-full p-6 rounded-[2.5rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xl space-y-8">
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-neutral-800 dark:text-neutral-100 tracking-tighter uppercase">용신 추천</h2>
        </div>
        {hasAbsentUi && (
          <div className="flex flex-col items-end">
             <Badge variant="amber">원국 부재 감지</Badge>
             {demoteAbsent && <span className="text-[9px] text-amber-500 font-bold mt-1">부재후순위 적용됨</span>}
          </div>
        )}
      </div>

      {/* 최종 요약 카드 */}
      <BestSummary best={recommend.best} />

      {/* 상세 추천 그룹 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
          <span className="text-[10px] font-black text-neutral-300 dark:text-neutral-600 uppercase tracking-widest">상세 정보</span>
          <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
        </div>
        
        <div className="grid gap-3">
          {recommend.groups.map((g) => (
            <GroupDetails
              key={g.kind}
              g={g}
              isBest={recommend.bestKind === g.kind}
              demoteAbsent={demoteAbsent}
              hasAbsent={hasAbsentUi}
              onDemoteAbsentChange={onDemoteAbsentChange}
            />
          ))}
        </div>
      </div>

      {/* 운용신 판넬 (카드 하단) */}
      <div className="pt-2">
        <YongshinLuckDiffPanel
          data={data}
          pillars={pillars}
          hourKey={hourKey}
          demoteAbsent={demoteAbsent}
          natal={recommend}
        />
      </div>
    </div>
  );
}
