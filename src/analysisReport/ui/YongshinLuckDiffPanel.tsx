// features/AnalysisReport/YongshinLuckDiffPanel.tsx
import React, { useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getYearGanZhi } from "@/shared/domain/ganji/common";
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";
import { computeUnifiedPower, type LuckChain } from "@/analysisReport/calc/utils/unifiedPower";
import computeYongshin from "@/analysisReport/calc/yongshin";

import type { Element } from "@/analysisReport/calc/utils/types";
import { elementPresenceFromPillars, lightElementScoreFromPillars } from "@/analysisReport/calc/reportCalc";
import {
  buildMultiYongshin,
  normalizeElementLabel,
  type YongshinMultiResult,
  type YongshinItem,
  type YongshinKind,
} from "@/analysisReport/calc/yongshin/multi";

const KIND_KO: Record<string, string> = {
  EOKBU: "억부용신",
  JOHU: "조후용신",
  TONGGWAN: "통관용신",
  BYEONGYAK: "병약용신",
  GYEOKGUK: "격국용신",
};

function kindKo(kind: string | null | undefined): string {
  if (!kind) return "—";
  return KIND_KO[kind] ?? kind; // 혹시 신규 kind 생기면 원문 유지
}

type DaeItem = { at: Date; gz: string };
function isDaeItem(v: unknown): v is DaeItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return o.at instanceof Date && !Number.isNaN(o.at.getTime()) && typeof o.gz === "string";
}

function safeGzAtYear(year: number): string {
  const dt = new Date(year, 1, 15, 12, 0, 0, 0); // 2/15 정오 고정
  return normalizeGZ(getYearGanZhi(dt) || "");
}

type Snap = {
  kind: YongshinKind | null;
  top1: string | null;
  fit: number;
  // 표시용
  label: string;
  result: YongshinMultiResult | null;
  top1ElNorm: Element | null;
};

function snapFromResult(r: YongshinMultiResult | null): Snap {
  const best = r?.best ?? null;
  const top = best?.candidates?.[0] ?? null;
  const kind = best?.kind ?? null;
  const top1 = top?.element ?? null;
  const top1ElNorm = top?.elNorm ?? (top?.element ? normalizeElementLabel(top.element) : null);
  const fit = typeof best?.fitScore === "number" ? best.fitScore : 0;
  const label = kind && top1 ? `${kindKo(kind)}:${top1}` : kind ? `${kindKo(kind)}:—` : "—";
  return { kind, top1, top1ElNorm, fit, label, result: r };
}

function buildEokbuListFromRaw(
  raw: { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null,
  elemPctFallback: Record<Element, number>
): YongshinItem[] {
  const arr = raw?.ordered ?? [];
  return arr.map((rec) => {
    const element = rec.element ?? "";
    const elNorm = normalizeElementLabel(element);
    const score =
      typeof rec.score === "number"
        ? rec.score
        : elNorm
          ? (elemPctFallback[elNorm] ?? 0)
          : 0;

    return {
      element,
      elNorm,
      score,
      reasons: Array.isArray(rec.reasons) ? rec.reasons : [],
    };
  });
}

function calcLuckMulti(args: {
  pillars: [string, string, string, string];
  hourKey: string;
  chain: LuckChain;
  tab: "대운" | "세운";
  demoteAbsent: boolean;
  presentMap: Record<Element, boolean>;
  // 필요하면 나중에 주입
  gyeokgukList?: YongshinItem[] | null;
}): YongshinMultiResult {
  const { pillars, hourKey, chain, tab, demoteAbsent, presentMap, gyeokgukList } = args;

  const unified = computeUnifiedPower({ natal: pillars, tab, chain, hourKey });

  const elemPctFallback =
    unified?.elementPercent100 ?? lightElementScoreFromPillars(pillars);

  const raw =
    typeof computeYongshin === "function"
      ? (computeYongshin(pillars, unified?.totals) as { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null)
      : null;

  const eokbuList = buildEokbuListFromRaw(raw, elemPctFallback);

  return buildMultiYongshin({
    eokbuList,
    monthGz: pillars[1] || "",
    elemPct: elemPctFallback,
    presentMap,
    demoteAbsent,
    gyeokgukList: Array.isArray(gyeokgukList) ? gyeokgukList : null,
  });
}

type Segment = {
  fromYear: number;
  toYear: number;
  snap: Snap;
};

function segmentize(items: Array<{ year: number; snap: Snap }>): Segment[] {
  const out: Segment[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (!last) {
      out.push({ fromYear: it.year, toYear: it.year, snap: it.snap });
      continue;
    }
    if (last.snap.label === it.snap.label) {
      last.toYear = it.year;
    } else {
      out.push({ fromYear: it.year, toYear: it.year, snap: it.snap });
    }
  }
  return out;
}

const Chip: React.FC<{
  text: string;
  tone?: "base" | "diff" | "pick";
  onClick?: () => void;
  title?: string;
}> = ({ text, tone = "base", onClick, title }) => {
  const cls =
    tone === "pick"
      ? "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
      : tone === "diff"
        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800 cursor-pointer"
        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";

  const inner = (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`} title={title}>
      {text}
    </span>
  );

  if (!onClick) return inner;

  return (
    <button type="button" className="inline-flex" onClick={onClick} title={title}>
      {inner}
    </button>
  );
};

function DetailBox({ snap }: { snap: Snap }) {
  const best = snap.result?.best ?? null;
  const top3 = best?.candidates?.slice(0, 3) ?? [];

  if (!best) {
    return <div className="text-xs text-neutral-600 dark:text-neutral-400">결과 없음</div>;
  }

  return (
    <div className="mt-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip text={`최종: ${kindKo(best.kind)}`} tone="pick" />
        <Chip text={`적합도 ${best.fitScore}`} />
        {top3[0]?.element ? <Chip text={`1순위 ${top3[0].element}`} tone="diff" /> : null}
      </div>

      {best.note ? (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 whitespace-normal break-words">
          {best.note}
        </div>
      ) : null}

      {top3.length ? (
        <ul className="mt-2 space-y-2">
          {top3.map((it, i) => (
            <li key={`${it.elNorm ?? it.element}-${i}`} className="text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Chip text={`${i + 1}위 ${it.element}`} />
                <Chip text={`점수 ${it.score}`} />
                {(it.reasons ?? []).slice(0, 4).map((r, k) => (
                  <Chip key={k} text={r} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">후보 없음</div>
      )}
    </div>
  );
}

export default function YongshinLuckDiffPanel(props: {
  data: MyeongSik;
  pillars: [string, string, string, string];
  hourKey: string;
  demoteAbsent: boolean;

  /** 원국 결과(비교 기준) */
  natal: YongshinMultiResult;
}) {
  const { data, pillars, hourKey, demoteAbsent, natal } = props;

  const presentMap = useMemo(
    () => elementPresenceFromPillars(pillars, { includeBranches: true }),
    [pillars]
  );

  const daeRaw = useDaewoonList(data, data?.mingSikType);
  const dae10 = useMemo(() => {
    if (!Array.isArray(daeRaw)) return [] as DaeItem[];
    return daeRaw.filter(isDaeItem).slice(0, 10);
  }, [daeRaw]);

  const natalSnap = useMemo(() => snapFromResult(natal), [natal]);

  // 펼침 상태
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggleOpen = (k: string) => setOpenKey((p) => (p === k ? null : k));

  const rows = useMemo(() => {
    return dae10
      .map((dae, idx) => {
        const daeGz = normalizeGZ(dae.gz) || "";
        const daeChain: LuckChain = { dae: daeGz || null, se: null, wol: null, il: null };

        const daeRes = calcLuckMulti({
          pillars,
          hourKey,
          chain: daeChain,
          tab: "대운",
          demoteAbsent,
          presentMap,
        });
        const daeSnap = snapFromResult(daeRes);

        const startYear = dae.at.getFullYear();
        const seList = Array.from({ length: 10 }, (_, k) => {
          const year = startYear + k;
          const seGz = safeGzAtYear(year);
          const seChain: LuckChain = { dae: daeGz || null, se: seGz || null, wol: null, il: null };

          const seRes = calcLuckMulti({
            pillars,
            hourKey,
            chain: seChain,
            tab: "세운",
            demoteAbsent,
            presentMap,
          });
          const seSnap = snapFromResult(seRes);
          return { year, snap: seSnap };
        });

        const segAll = segmentize(seList);
        const segDiffOnly = segAll.filter((seg) => seg.snap.top1ElNorm !== daeSnap.top1ElNorm);

        const daeDiffFromNatal = daeSnap.top1ElNorm !== natalSnap.top1ElNorm;

        const hasAnyChange = daeDiffFromNatal || segDiffOnly.length > 0;

        return {
          idx,
          dae,
          daeLabel: `${startYear}~ ${daeGz || "—"}`,
          daeSnap,
          daeDiffFromNatal,
          segDiffOnly,
          hasAnyChange,
        };
      })
      .filter((r) => r.hasAnyChange); // ✅ 변동 없는 대운은 통째로 제거
  }, [dae10, pillars, hourKey, demoteAbsent, presentMap, natalSnap.top1ElNorm]);

  const anyChange = useMemo(
    () => rows.some((r) => r.hasAnyChange),
    [rows]
  );

  return (
    <div className="rounded-xl bg-neutral-100 dark:bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold">운용신 변동 요약</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-normal break-words">
          기준(원국): {natalSnap.label} / 적합도 {natalSnap.fit}
        </div>
      </div>

      {!anyChange ? (
        <div className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          변동되는 시점이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const daeKey = `dae:${r.idx}`;
            const daeOpen = openKey === daeKey;

            return (
              <div key={daeKey} className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip text={`대운 ${r.daeLabel}`} tone="base" />
                  <Chip
                    text={`최종 ${r.daeSnap.label} (적합도 ${r.daeSnap.fit})`}
                    tone={r.daeDiffFromNatal ? "diff" : "base"}
                    onClick={() => toggleOpen(daeKey)}
                    title="누르면 상세(top3) 펼침"
                  />
                  {r.daeDiffFromNatal ? <Chip text="원국과 다름" tone="diff" /> : null}
                </div>

                {/* 세운에서 바뀌는 구간만 */}
                {r.segDiffOnly.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.segDiffOnly.map((seg, i) => {
                      const k = `seg:${r.idx}:${i}`;
                      const open = openKey === k;
                      const range =
                        seg.fromYear === seg.toYear
                          ? `${seg.fromYear}`
                          : `${seg.fromYear}~${seg.toYear}`;

                      return (
                        <div key={k} className="inline-flex flex-col">
                          <div className="flex items-center gap-2">
                            <Chip
                              text={`세운 ${range} → ${seg.snap.label} (적합도 ${seg.snap.fit})`}
                              tone="diff"
                              onClick={() => toggleOpen(k)}
                              title="누르면 상세(top3) 펼침"
                            />
                          </div>
                          {open ? <DetailBox snap={seg.snap} /> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {daeOpen ? <DetailBox snap={r.daeSnap} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
