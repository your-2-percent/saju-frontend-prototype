// features/AnalysisReport/HarmonyTagPanel.tsx
import React from "react";
import { buildHarmonyTags, buildAllRelationTags, Pillars4 } from "./logic/relations";
import type { BlendTab } from "./logic/blend";

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

function Row({
  label,
  natal,
  luck,
}: {
  label: string;
  natal: string[];
  luck: string[];
}) {
  const shownNatal = natal.length > 0 ? natal : ["#없음"];
  const displayNatal =
    luck.length > 0 ? shownNatal.filter((t) => t !== "#없음") : shownNatal;

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
        {luck.map((t, i) => {
          let src: "dae" | "se" | "wol" = "dae";
          if (t.startsWith("세운")) src = "se";
          else if (t.startsWith("월운")) src = "wol";
          return (
            <span
              key={`luck-${i}`}
              className={
                "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
                getClass(t, src)
              }
            >
              {t}
            </span>
          );
        })}
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

function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export default function HarmonyTagPanel({
  pillars,
  daewoon,
  sewoon,
  wolwoon,
  tab,
}: {
  pillars: Pillars4;
  daewoon?: string | null;
  sewoon?: string | null;
  wolwoon?: string | null;
  tab: BlendTab;
}) {
  const natalRaw = buildHarmonyTags(pillars) as HarmonyLike;
  const luckTags = buildAllRelationTags({ natal: pillars, daewoon, sewoon, wolwoon });

  // 원국 타이틀
  let fullTitle = natalRaw.title;

  // 운 타이틀 붙이기
  if (tab !== "원국") {
    const extra: string[] = [];
    if (tab === "대운" && daewoon) extra.push(`${daewoon}대운`);
    if (tab === "세운") {
      if (daewoon) extra.push(`${daewoon}대운`);
      if (sewoon) extra.push(`${sewoon}세운`);
    }
    if (tab === "월운") {
      if (daewoon) extra.push(`${daewoon}대운`);
      if (sewoon) extra.push(`${sewoon}세운`);
      if (wolwoon) extra.push(`${wolwoon}월운`);
    }
    if (extra.length > 0) {
      fullTitle += " + " + extra.join(" ");
    }
  }

  const natal = {
    cheonganHap: arr(natalRaw.cheonganHap),
    cheonganChung: arr(natalRaw.cheonganChung),
    jijiSamhap: arr(natalRaw.jijiSamhap),
    jijiBanghap: arr(natalRaw.jijiBanghap),
    jijiYukhap: arr(natalRaw.jijiYukhap),
    amhap: arr(natalRaw.amhap),
    ganjiAmhap: arr(natalRaw.ganjiAmhap),
    jijiChung: arr(natalRaw.jijiChung),
    jijiHyeong: arr(natalRaw.jijiHyeong),
    jijiPa: arr(natalRaw.jijiPa),
    jijiHae: arr(natalRaw.jijiHae),
  };

  return (
    <div className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-3">
      <div className="text-base font-bold mb-1">합/충/형/파/해</div>
      <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
        {fullTitle}
      </div>

      <Row label="천간합" natal={natal.cheonganHap} luck={luckTags.cheonganHap} />
      <Row label="천간충" natal={natal.cheonganChung} luck={luckTags.cheonganChung} />
      <div className="border-t border-neutral-200 dark:border-neutral-800 my-2" />
      <Row label="지지삼합" natal={natal.jijiSamhap} luck={luckTags.jijiSamhap} />
      <Row label="지지방합" natal={natal.jijiBanghap} luck={luckTags.jijiBanghap} />
      <Row label="지지육합" natal={natal.jijiYukhap} luck={luckTags.jijiYukhap} />
      <Row label="암합" natal={natal.amhap} luck={luckTags.amhap} />
      <Row label="간지암합" natal={natal.ganjiAmhap} luck={luckTags.ganjiAmhap} />
      <Row label="지지충" natal={natal.jijiChung} luck={luckTags.jijiChung} />
      <Row label="지지형" natal={natal.jijiHyeong} luck={luckTags.jijiHyeong} />
      <Row label="지지파" natal={natal.jijiPa} luck={luckTags.jijiPa} />
      <Row label="지지해" natal={natal.jijiHae} luck={luckTags.jijiHae} />
    </div>
  );
}
