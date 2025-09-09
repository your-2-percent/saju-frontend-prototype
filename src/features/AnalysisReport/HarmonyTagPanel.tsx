// features/AnalysisReport/HarmonyTagPanel.tsx
import { buildHarmonyTags, buildAllRelationTags, Pillars4 } from "./logic/relations";
import type { BlendTab } from "./logic/blend";

/* ========================
 * 색상 유틸
 * ======================== */
function getClass(t: string, source: "natal" | "dae" | "se" | "wol"): string {
  if (t === "#없음") {
    return "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-700";
  }
  switch (source) {
    case "natal":
      return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800";
    case "dae":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
    case "se":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
    case "wol":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800";
    default:
      return "";
  }
}

/* ========================
 * Row
 * ======================== */
function Row({
  label,
  natal,
  dae,
  se,
  wol,
}: {
  label: string;
  natal: string[];
  dae: string[];
  se: string[];
  wol: string[];
}) {
  const hasLuck = (dae.length + se.length + wol.length) > 0;
  const shownNatal = natal.length > 0 ? natal : ["#없음"];
  const displayNatal = hasLuck ? shownNatal.filter((t) => t !== "#없음") : shownNatal;

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {displayNatal.map((t, i) => (
          <span
            key={`natal-${i}`}
            className={
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
              getClass(t, "natal")
            }
          >
            {t}
          </span>
        ))}
        {dae.map((t, i) => (
          <span
            key={`dae-${i}`}
            className={
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
              getClass(t, "dae")
            }
          >
            {t}
          </span>
        ))}
        {se.map((t, i) => (
          <span
            key={`se-${i}`}
            className={
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
              getClass(t, "se")
            }
          >
            {t}
          </span>
        ))}
        {wol.map((t, i) => (
          <span
            key={`wol-${i}`}
            className={
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
              getClass(t, "wol")
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** buildHarmonyTags() 결과 안전 접근용 타입(원진/귀문 제거) */
type HarmonyLike = {
  title: string;
  cheonganHap?: string[];
  cheonganChung?: string[];
  jijiSamhap?: string[];
  jijiBanghap?: string[];
  jijiYukhap?: string[];
  amhap?: string[];
  ganjiAmhap?: string[];
  jijiChung?: string[];
  jijiHyeong?: string[];
  jijiPa?: string[];
  jijiHae?: string[];
};

type LuckLike = Omit<HarmonyLike, "title">;

function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

/* 집합 차집합: next에만 있는 항목 */
function diff(fromArr: unknown, toArr: unknown): string[] {
  const a = new Set(arr(fromArr));
  const b = arr(toArr);
  return b.filter((x) => !a.has(x));
}

export default function HarmonyTagPanel({
  pillars,
  daewoon,
  sewoon,
  wolwoon,
  tab,
}: {
  pillars: Pillars4;
  daewoon?: string;
  sewoon?: string;
  wolwoon?: string;
  tab: BlendTab;
}) {
  /* 원국 태그 */
  const natalRaw = buildHarmonyTags(pillars) as HarmonyLike;

  /* 단계별 luck 태그 (함수는 그대로, 호출만 4단계) */
  const base = buildAllRelationTags({ natal: pillars }) as LuckLike;

  const stepA = daewoon
    ? (buildAllRelationTags({ natal: pillars, daewoon }) as LuckLike)
    : base;

  const stepB = sewoon
    ? (buildAllRelationTags({ natal: pillars, daewoon, sewoon }) as LuckLike)
    : stepA;

  const stepC = wolwoon
    ? (buildAllRelationTags({ natal: pillars, daewoon, sewoon, wolwoon }) as LuckLike)
    : stepB;

  // 원국 타이틀
  let fullTitle = natalRaw.title;

  // 운 타이틀 붙이기
  if (tab !== "원국") {
    const extra: string[] = [];
    if (daewoon) extra.push(`${daewoon}대운`);
    if (tab === "세운" || tab === "월운") {
      if (sewoon) extra.push(`${sewoon}세운`);
    }
    if (tab === "월운" && wolwoon) {
      extra.push(`${wolwoon}월운`);
    }
    if (extra.length > 0) {
      fullTitle += " + " + extra.join(" ");
    }
  }

  /* 카테고리별로 증분 분리 */
  const mk = (key: keyof LuckLike) => ({
    natal: arr((natalRaw as LuckLike)[key]),
    dae: diff(base[key], stepA[key]),
    se: diff(stepA[key], stepB[key]),
    wol: diff(stepB[key], stepC[key]),
  });

  const K = {
    cheonganHap: mk("cheonganHap"),
    cheonganChung: mk("cheonganChung"),
    jijiSamhap: mk("jijiSamhap"),
    jijiBanghap: mk("jijiBanghap"),
    jijiYukhap: mk("jijiYukhap"),
    amhap: mk("amhap"),
    ganjiAmhap: mk("ganjiAmhap"),
    jijiChung: mk("jijiChung"),
    jijiHyeong: mk("jijiHyeong"),
    jijiPa: mk("jijiPa"),
    jijiHae: mk("jijiHae"),
  };

  return (
    <div className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-3">
      <div className="text-base font-bold mb-1">합/충/형/파/해</div>
      <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
        {fullTitle}
      </div>

      <Row label="천간합" natal={K.cheonganHap.natal} dae={K.cheonganHap.dae} se={K.cheonganHap.se} wol={K.cheonganHap.wol} />
      <Row label="천간충" natal={K.cheonganChung.natal} dae={K.cheonganChung.dae} se={K.cheonganChung.se} wol={K.cheonganChung.wol} />
      <div className="border-t border-neutral-200 dark:border-neutral-800 my-2" />
      <Row label="지지삼합" natal={K.jijiSamhap.natal} dae={K.jijiSamhap.dae} se={K.jijiSamhap.se} wol={K.jijiSamhap.wol} />
      <Row label="지지방합" natal={K.jijiBanghap.natal} dae={K.jijiBanghap.dae} se={K.jijiBanghap.se} wol={K.jijiBanghap.wol} />
      <Row label="지지육합" natal={K.jijiYukhap.natal} dae={K.jijiYukhap.dae} se={K.jijiYukhap.se} wol={K.jijiYukhap.wol} />
      <Row label="암합" natal={K.amhap.natal} dae={K.amhap.dae} se={K.amhap.se} wol={K.amhap.wol} />
      <Row label="간지암합" natal={K.ganjiAmhap.natal} dae={K.ganjiAmhap.dae} se={K.ganjiAmhap.se} wol={K.ganjiAmhap.wol} />
      <Row label="지지충" natal={K.jijiChung.natal} dae={K.jijiChung.dae} se={K.jijiChung.se} wol={K.jijiChung.wol} />
      <Row label="지지형" natal={K.jijiHyeong.natal} dae={K.jijiHyeong.dae} se={K.jijiHyeong.se} wol={K.jijiHyeong.wol} />
      <Row label="지지파" natal={K.jijiPa.natal} dae={K.jijiPa.dae} se={K.jijiPa.se} wol={K.jijiPa.wol} />
      <Row label="지지해" natal={K.jijiHae.natal} dae={K.jijiHae.dae} se={K.jijiHae.se} wol={K.jijiHae.wol} />
    </div>
  );
}
