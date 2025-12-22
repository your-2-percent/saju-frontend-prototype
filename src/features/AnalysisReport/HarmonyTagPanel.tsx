// features/AnalysisReport/HarmonyTagPanel.tsx
import { buildHarmonyTags, buildAllRelationTags, Pillars4 } from "./logic/relations";
//import type { BlendTab } from "./logic/blend";

/* ========================
 * 색상 유틸
 * ======================== */
type StageTab = "원국" | "대운" | "세운" | "월운" | "일운";

function getClass(t: string, source: "natal" | "dae" | "se" | "wol" | "il"): string {
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
    case "il":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800";
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
  il
}: {
  label: string;
  natal: string[];
  dae: string[];
  se: string[];
  wol: string[];
  il: string[];
}) {
  const hasLuck = (dae.length + se.length + wol.length + il.length) > 0;
  const shownNatal = natal.length > 0 ? natal : ["#없음"];
  const displayNatal = hasLuck ? shownNatal.filter((t) => t !== "#없음") : shownNatal;

  // ✅ 태그 유무 판단
  const hasTag =
    displayNatal.some((t) => t !== "#없음") ||
    dae.length > 0 ||
    se.length > 0 ||
    wol.length > 0 ||
    il.length > 0;

  const labelClass = hasTag
    ? "shrink-0 w-20 text-xs font-semibold text-orange-700 dark:text-orange-300 mt-1"
    : "shrink-0 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-400 mt-1";

  return (
    <div className="flex items-start gap-3 border border-gray-700 dark:border-gray-200 p-2 rounded-sm">
      <div className={labelClass}>{label}</div>
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
        {il.map((t, i) => (
          <span
            key={`il-${i}`}
            className={
              "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
              getClass(t, "il")
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
  jijiBanhap?: string[];
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
  ilwoon,
  tab = "원국", 
}: {
  pillars: Pillars4;
  daewoon?: string;
  sewoon?: string;
  wolwoon?: string;
  ilwoon?: string;
  tab?: StageTab;
  //tab: BlendTab;
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

  const stepD = ilwoon
    ? (buildAllRelationTags({ natal: pillars, daewoon, sewoon, wolwoon, ilwoon }) as LuckLike)
    : stepC;

  /* 카테고리별로 증분 분리 */
  const mk = (key: keyof LuckLike) => ({
    natal: arr((natalRaw as LuckLike)[key]),
    dae: diff(base[key], stepA[key]),
    se: diff(stepA[key], stepB[key]),
    wol: diff(stepB[key], stepC[key]),
    il: diff(stepC[key], stepD[key])
  });

  const K = {
    cheonganHap: mk("cheonganHap"),
    cheonganChung: mk("cheonganChung"),
    jijiSamhap: mk("jijiSamhap"),
    jijiBanhap: mk("jijiBanhap"),
    jijiBanghap: mk("jijiBanghap"),
    jijiYukhap: mk("jijiYukhap"),
    amhap: mk("amhap"),
    ganjiAmhap: mk("ganjiAmhap"),
    jijiChung: mk("jijiChung"),
    jijiHyeong: mk("jijiHyeong"),
    jijiPa: mk("jijiPa"),
    jijiHae: mk("jijiHae"),
  };

  const pick = (v: { natal: string[]; dae: string[]; se: string[]; wol: string[]; il: string[] }) => {

    if (tab === "원국") {
      return { natal: v.natal, dae: [], se: [], wol: [], il: [] };
    }
    if (tab === "대운") {
      return { natal: v.natal, dae: v.dae, se: [], wol: [], il: [] };
    }
    if (tab === "세운") {
      return { natal: v.natal, dae: v.dae, se: v.se, wol: [], il: [] };
    }
    if (tab === "월운") {
      return { natal: v.natal, dae: v.dae, se: v.se, wol: v.wol, il: [] };
    }
    if (tab === "일운") {
      return { natal: v.natal, dae: v.dae, se: v.se, wol: v.wol, il: v.il };
    }

    return { natal: [], dae: [], se: [], wol: [], il: [] };
  };

  return (
    <div className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-2">
      <div className="text-base font-bold mb-1">형충회합</div>

      {/* 각 Row에 pick() 적용 */}
      <Row label="천간합" {...pick(K.cheonganHap)} />
      <Row label="천간충" {...pick(K.cheonganChung)} />
      <div className="border-t border-neutral-200 dark:border-neutral-800 my-2" />
      <Row label="지지삼합" {...pick(K.jijiSamhap)} />
      <Row label="지지반합" {...pick(K.jijiBanhap)} />
      <Row label="지지방합" {...pick(K.jijiBanghap)} />
      <Row label="지지육합" {...pick(K.jijiYukhap)} />
      <Row label="암합" {...pick(K.amhap)} />
      <Row label="간지암합" {...pick(K.ganjiAmhap)} />
      <Row label="지지충" {...pick(K.jijiChung)} />
      <Row label="지지형" {...pick(K.jijiHyeong)} />
      <Row label="지지파" {...pick(K.jijiPa)} />
      <Row label="지지해" {...pick(K.jijiHae)} />
    </div>
  );
}