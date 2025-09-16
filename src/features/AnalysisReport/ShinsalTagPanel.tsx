// features/AnalysisReport/ShinsalTagPanel.tsx
import { useMemo, useState } from "react";
import type { Pillars4 } from "./logic/relations";
import { buildShinsalTags, type ShinsalBasis } from "./logic/shinsal";

type StageTab = "전체" | "원국" | "대운" | "세운" | "월운";

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

function Chips({ items, source }: { items: string[]; source: "natal" | "dae" | "se" | "wol" }) {
  const list = items.length > 0 ? items : ["#없음"];
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((t, i) => (
        <span
          key={`${source}-${i}-${t}`}
          className={"text-xs px-2 py-1 rounded-full border whitespace-nowrap " + getClass(t, source)}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; items: string[]; source: "natal" | "dae" | "se" | "wol" }>;
}) {
  return (
    <div className="space-y-2 desk:flex-1 desk:px-1">
      <div className="text-md font-bold text-neutral-800 dark:text-neutral-200 mt-2">{title}</div>
      {rows.map((row) => {
        const hasTag = row.items.some((t) => t !== "#없음");
        const labelClass = hasTag
          ? "shrink-0 w-12 text-xs font-semibold text-orange-700 dark:text-orange-300 mt-1"
          : "shrink-0 w-12 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1";

        return (
          <div
            className="flex items-start gap-3 border border-gray-700 dark:border-gray-400 p-2 rounded-sm"
            key={`${title}-${row.label}`}
          >
            <div className={labelClass}>{row.label}</div>
            <Chips items={row.items.length > 0 ? row.items : ["#없음"]} source={row.source} />
          </div>
        );
      })}
    </div>
  );
}

export default function ShinsalTagPanel({
  pillars,
  daewoon,
  sewoon,
  wolwoon,
  tab = "전체",
}: {
  pillars: Pillars4;
  daewoon?: string | null;
  sewoon?: string | null;
  wolwoon?: string | null;
  tab?: StageTab;
}) {
  // ▼ 셀렉트 상태: 공망/삼재 기준
  const [voidSel, setVoidSel] = useState<"일공망" | "연공망">("일공망");
  const [samjaeSel, setSamjaeSel] = useState<"일삼재" | "연삼재">("일삼재");

  const basis: ShinsalBasis = useMemo(
    () => ({
      voidBasis: voidSel === "일공망" ? "day" : "year",
      samjaeBasis: samjaeSel === "일삼재" ? "day" : "year",
    }),
    [voidSel, samjaeSel]
  );

  const data = useMemo(
    () => buildShinsalTags({ natal: pillars, daewoon, sewoon, wolwoon, basis }),
    [pillars, daewoon, sewoon, wolwoon, basis]
  );

  const { good, bad, meta } = data;

  // 원국 칩 접두어 "원국 " 부여
  const withNatalPrefix = (items: string[]) => items.map((t) => (t === "#없음" ? t : `원국 ${t}`));

  const applyTab = <T extends Array<{ label: string; items: string[]; source: "natal" | "dae" | "se" | "wol" }>>(rows: T, tb: StageTab): T => {
    if (tb === "전체") return rows;
    const want = tb === "원국" ? "natal" : tb === "대운" ? "dae" : tb === "세운" ? "se" : "wol";
    return rows.filter((r) => r.source === want) as T;
  };

  // 표시는 요구 순서: 시주, 일주, 월주, 연주, 대운, 세운, 월운
  const goodRowsAll = [
    { label: "시주", items: withNatalPrefix(good.si),   source: "natal" as const },
    { label: "일주", items: withNatalPrefix(good.il),   source: "natal" as const },
    { label: "월주", items: withNatalPrefix(good.wol),  source: "natal" as const },
    { label: "연주", items: withNatalPrefix(good.yeon), source: "natal" as const },
    { label: "대운", items: good.dae,                   source: "dae"   as const },
    { label: "세운", items: good.se,                    source: "se"    as const },
    { label: "월운", items: good.wolun,                 source: "wol"   as const },
  ];
  const badRowsAll = [
    { label: "시주", items: withNatalPrefix(bad.si),   source: "natal" as const },
    { label: "일주", items: withNatalPrefix(bad.il),   source: "natal" as const },
    { label: "월주", items: withNatalPrefix(bad.wol),  source: "natal" as const },
    { label: "연주", items: withNatalPrefix(bad.yeon), source: "natal" as const },
    { label: "대운", items: bad.dae,                   source: "dae"   as const },
    { label: "세운", items: bad.se,                    source: "se"    as const },
    { label: "월운", items: bad.wolun,                 source: "wol"   as const },
  ];

  // ✅ 여기서 탭 적용
  const goodRows = applyTab(goodRowsAll, tab);
  const badRows  = applyTab(badRowsAll,  tab);

  // 셀렉트 아래 안내문구
  const voidLeft  = meta.voidPair.day  ? `일공망(${meta.voidPair.day.join("")})`   : "일공망(—)";
  const voidRight = meta.voidPair.year ? `연공망(${meta.voidPair.year.join("")})` : "연공망(—)";
  const sjLeft    = meta.samjaeYears.day  ? `일삼재(${meta.samjaeYears.day.join("·")})`   : "일삼재(—)";
  const sjRight   = meta.samjaeYears.year ? `연삼재(${meta.samjaeYears.year.join("·")})` : "연삼재(—)";

  return (
    <div className="rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-2">
      <div className="text-base font-bold mb-1">신살(길신/흉살)</div>

      {/* 기준 선택 UI */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-neutral-600 dark:text-neutral-300">공망 기준</label>
          <select
            value={voidSel}
            onChange={(e) => setVoidSel(e.target.value as typeof voidSel)}
            className="px-2 h-30 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          >
            <option value="일공망">{voidLeft}</option>
            <option value="연공망">{voidRight}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-neutral-600 dark:text-neutral-300">삼재 기준</label>
          <select
            value={samjaeSel}
            onChange={(e) => setSamjaeSel(e.target.value as typeof samjaeSel)}
            className="px-2 h-30 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          >
            <option value="일삼재">{sjLeft}</option>
            <option value="연삼재">{sjRight}</option>
          </select>
        </div>
      </div>

      <div className="desk:flex">
        <Section title="신(神)" rows={goodRows} />
        <div className="block desk:hidden border-t border-neutral-200 dark:border-neutral-800 mt-4 mb-3" />
        <Section title="살(殺)" rows={badRows} />
      </div>
    </div>
  );
}