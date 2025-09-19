import {
  천간 as STEMS,
  지지 as BRANCHES,
  간지_한자_MAP,
  천간_오행,
  지지_오행,
  십신_천간,
  십신_지지
} from "@/shared/domain/간지/const";
import type { Settings } from "@/shared/lib/hooks/useSettingsStore";

type ElementType = "목" | "화" | "토" | "금" | "수";

// 천간: '갑' | '을' ...
type Stem = (typeof STEMS)[number];
// 지지: '자' | '축' ...
type Branch = (typeof BRANCHES)[number];

export function normalizeStem(ch: string): Stem | string {
  const iKor = STEMS.indexOf(ch as Stem);
  if (iKor !== -1) return STEMS[iKor];
  const iHan = 간지_한자_MAP.천간.indexOf(ch as (typeof 간지_한자_MAP.천간)[number]);
  if (iHan !== -1) return STEMS[iHan];
  return ch;
}

export function normalizeBranch(ch: string): Branch | string {
  const iKor = BRANCHES.indexOf(ch as Branch);
  if (iKor !== -1) return BRANCHES[iKor];
  const iHan = 간지_한자_MAP.지지.indexOf(ch as (typeof 간지_한자_MAP.지지)[number]);
  if (iHan !== -1) return BRANCHES[iHan];
  return ch;
}

/** 오행 → Tailwind 배경색 */
export function elemToBg(elem?: ElementType, settingsV1?: Settings): string {
  if (settingsV1?.difficultyMode) {
    if (settingsV1?.theme === "light") {
      // 라이트 모드 → 흰색 바탕 + 회색 테두리
      return "bg-white border border-gray-300 text-gray-800 text-black";
    }
    // 다크 모드 → 올화이트
    return "bg-white text-black";
  }

  // ✅ 기존 로직
  switch (elem) {
    case "목": return "bg-green-600";
    case "화": return "bg-red-600";
    case "토": return "bg-yellow-500";
    case "금": return "bg-gray-400";
    case "수": return "bg-black";
    default:   return "bg-neutral-700";
  }
}

/** 간지 글자 → 색상 */
export function getElementColor(
  char: string,
  kind: "stem" | "branch",
  settingsV1?: Settings   // ✅ settings 전달받기
): string {
  if (kind === "stem") {
    const kor = normalizeStem(char);
    const idx = STEMS.indexOf(kor as (typeof STEMS)[number]);
    const elem = idx >= 0 ? 천간_오행[idx] : undefined;
    return elemToBg(elem as ElementType, settingsV1);   // ✅ settings 반영
  } else {
    const kor = normalizeBranch(char);
    const idx = BRANCHES.indexOf(kor as (typeof BRANCHES)[number]);
    const elem = idx >= 0 ? 지지_오행[idx] : undefined;
    return elemToBg(elem as ElementType, settingsV1);   // ✅ settings 반영
  }
}

export type Stem10sin = keyof typeof 십신_천간;
export type Branch10sin = keyof (typeof 십신_지지)[Stem10sin];

export function getSipSin(
  dayStem: Stem10sin | string,
  target: { stem?: string; branch?: string }
): string {
  const ds = normalizeStem(dayStem) as Stem10sin | null;
  if (!ds) throw new Error(`getSipSin: invalid dayStem ${dayStem}`);

  if (target.stem) {
    const st = normalizeStem(target.stem) as Stem10sin | null;
    if (!st) throw new Error(`getSipSin: invalid stem ${target.stem}`);
    return 십신_천간[ds][st];
  }

  if (target.branch) {
    const br = normalizeBranch(target.branch) as Branch10sin | null;
    if (!br) throw new Error(`getSipSin: invalid branch ${target.branch}`);
    return 십신_지지[ds][br];
  }

  throw new Error("getSipSin: stem or branch required");
}
