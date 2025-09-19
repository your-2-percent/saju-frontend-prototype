import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { HiddenStems } from "@/shared/domain/hidden-stem";
import type { Settings } from "@/shared/lib/hooks/useSettings";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

/* ── 표시 변환 테이블 ── */
const STEM_H2K = {
  "甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무",
  "己":"기","庚":"경","辛":"신","壬":"임","癸":"계",
} as const;
const STEM_K2H = Object.fromEntries(
  Object.entries(STEM_H2K).map(([h, k]) => [k, h])
) as Record<string, string>;

const BR_H2K = {
  "子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사",
  "午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해",
} as const;
const BR_K2H = Object.fromEntries(
  Object.entries(BR_H2K).map(([h, k]) => [k, h])
) as Record<string, string>;

const STEMS_HANJA = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
const STEMS_KO    = ["갑","을","병","정","무","기","경","신","임","계"] as const;
const BRANCH_HANJA = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;
const BRANCH_KO    = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;

function isKoStem(s: string): s is Stem10sin {
  return (STEMS_KO as readonly string[]).includes(s);
}
function isKoBranch(s: string): s is Branch10sin {
  return (BRANCH_KO as readonly string[]).includes(s);
}
function isHanjaStem(s: string): s is Stem10sin {
  return (STEMS_HANJA as readonly string[]).includes(s);
}
function isHanjaBranch(s: string): s is Branch10sin {
  return (BRANCH_HANJA as readonly string[]).includes(s);
}

/* ── 표시용: 글자 변환 (사용자 설정 반영) ── */
function toDisplayChar(
  ch: string,
  kind: "stem" | "branch",
  type: Settings["charType"]
) {
  if (type === "한글") {
    return kind === "stem"
      ? (STEM_H2K as Record<string, string>)[ch] ?? ch
      : (BR_H2K   as Record<string, string>)[ch] ?? ch;
  }
  // "한자"
  return kind === "stem"
    ? (STEM_K2H as Record<string, string>)[ch] ?? ch
    : (BR_K2H   as Record<string, string>)[ch] ?? ch;
}

/* ── 유틸/색상/십신용: 항상 ‘한자’로 정규화 ── */
function toHanjaStemKey(ch: string): Stem10sin {
  const h = (STEM_K2H as Record<string, string>)[ch] ?? ch; // 한글→한자 시도
  if (isHanjaStem(h)) return h;
  return "갑"; // fallback (기본값 지정)
}

function toHanjaBranchKey(ch: string): Branch10sin {
  const h = (BR_K2H as Record<string, string>)[ch] ?? ch; // 한글→한자 시도
  if (isHanjaBranch(h)) return h;
  return "자"; // fallback (기본값 지정)
}

/* ── HiddenStems용: 항상 ‘한글’로 정규화 ── */
function toKoStemKey(ch: string): Stem10sin {
  if (isKoStem(ch)) return ch;
  const k = (STEM_H2K as Record<string, string>)[ch] ?? ch;
  return isKoStem(k) ? k : "갑";
}
function toKoBranchKey(ch: string): Branch10sin {
  if (isKoBranch(ch)) return ch;
  const k = (BR_H2K as Record<string, string>)[ch] ?? ch;
  return isKoBranch(k) ? k : "자";
}

/* ── 얇게(음간/음지) ── */
const YIN_STEMS  = new Set(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCH = new Set(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);
const isYinStem   = (ch: string) => YIN_STEMS.has(ch);
const isYinBranch = (ch: string) => YIN_BRANCH.has(ch);

type Variant = "auto" | "white";

export function PillarCardShared({
  label,
  gz,                    // 2글자(한글/한자 혼재 가능)
  dayStem,               // 일간(보통 한글: 갑~계)
  settings,
  unseongText,
  shinsalText,
  hideBranchSipSin = true,
  hideHiddenStems = false,
  size = "sm",
  variant = "auto",      // ✅ 추가: "white"면 항상 흰 카드
}: {
  label: string;
  gz: string;
  dayStem: Stem10sin;
  settings: Settings;
  unseongText?: string | null;
  shinsalText?: string | null;
  hideBranchSipSin?: boolean;
  hideHiddenStems?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: Variant;
}) {
  const stem   = gz.charAt(0);
  const branch = gz.charAt(1);

  /* 표시 글자(사용자 설정 반영) */
  const stemDisp   = toDisplayChar(stem,   "stem",   settings.charType);
  const branchDisp = toDisplayChar(branch, "branch", settings.charType);

  /* 유틸/색상/십신용 키는 ‘한자’로 통일 */
  const stemKeyForUtil    = toHanjaStemKey(stem);
  const branchKeyForUtil  = toHanjaBranchKey(branch);
  const dayStemKeyForUtil = toHanjaStemKey(dayStem);   // 일간 → 한자 키

  /* HiddenStems용 키는 ‘한글’로 통일 */
  const branchKeyForHidden  = toKoBranchKey(branch);
  const dayStemKeyForHidden = toKoStemKey(dayStem);

  /* 십신 */
  const sipSinStem = settings.showSipSin
    ? getSipSin(dayStemKeyForUtil, { stem: stemKeyForUtil })
    : null;

  const sipSinBranch = (!hideBranchSipSin && settings.showSipSin)
    ? getSipSin(dayStemKeyForUtil, { branch: branchKeyForUtil })
    : null;

  /* 얇게 */
  const thinStemClass   = settings.thinEum && isYinStem(stem)     ? "font-thin" : "font-bold";
  const thinBranchClass = settings.thinEum && isYinBranch(branch) ? "font-thin" : "font-bold";

  const sizeMap = {
    sm: "w-10 h-10 sm:w-12 sm:h-12",
    md: "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16",
    lg: "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20",
  } as const;

  /* 지장간 표시 여부 */
  const showHidden = !hideHiddenStems && !!settings.hiddenStem; // "all" | "regular"

  /* HiddenStems 모드 매핑 */
  const hiddenMode: "all" | "main" =
    settings.hiddenStem === "regular" ? "main" : "all";
  const hiddenMapping: "classic" | "hgc" =
    settings.hiddenStemMode === "hgc" ? "hgc" : "classic";

  /* ── 스타일 분기 ── */
  const white = variant === "white";

  const cardRootCls = white
    ? "bg-white text-neutral-900 border border-neutral-200"
    : "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800";

  const headCls = white
    ? "bg-neutral-100 text-neutral-700"
    : "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200";

  const boxBorderCls = white ? "border-neutral-200" : "border-neutral-200 dark:border-neutral-800";
  const sipTextCls   = white ? "text-neutral-500"  : "text-neutral-400";
  const extraTextCls = white ? "text-neutral-500"  : "text-neutral-400";

  // 박스(천간/지지) 스타일
  // - white 변형: 항상 흰 배경 + 진한 글자
  // - auto  변형: 오행 색상 배경(getElementColor) + 흰 글자
  const { settings: settingsObj } = useSettingsStore();

  const stemBoxCls = white
    ? `bg-white ${boxBorderCls}`
    : `${getElementColor(stemKeyForUtil, "stem", settingsObj)} ${boxBorderCls}`;
    // 난이도 모드일 때는 settings.theme 체크
    const stemTextCls =
      settingsObj.difficultyMode
        ? settingsObj.theme === "light"
          ? "text-neutral-900" // 라이트 모드
          : "text-black"       // 다크 모드
        : "text-white";        // 일반 모드

      const branchBoxCls = white
        ? `bg-white ${boxBorderCls}`
        : `${getElementColor(branchKeyForUtil, "branch", settingsObj)} ${boxBorderCls}`;
      const branchTextCls =
      settingsObj.difficultyMode
        ? settingsObj.theme === "light"
          ? "text-neutral-900"
          : "text-black"
        : "text-white";

  return (
    <div className={`rounded-sm desk:rounded-xl overflow-hidden ${cardRootCls}`}>
      <div className={`py-2 text-center text-[10px] desk:text-xs tracking-wider ${headCls} text-nowrap`}>
        {label}
      </div>

      <div className="py-3 flex flex-col items-center gap-1">
        {/* 십신(천간) */}
        {sipSinStem && (
          <div className={`text-[10px] desk:text-xs ${sipTextCls} text-nowrap`}>
            {sipSinStem}
          </div>
        )}

        {/* 천간 */}
        <div
          className={`${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border ${stemBoxCls}`}
        >
          <span className={`text-2xl md:text-3xl ${stemTextCls} ${thinStemClass}`}>
            {stemDisp}
          </span>
        </div>

        {/* 지지 */}
        <div
          className={`${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border ${branchBoxCls}`}
        >
          <span className={`text-2xl md:text-3xl ${branchTextCls} ${thinBranchClass}`}>
            {branchDisp}
          </span>
        </div>

        {/* 지장간 */}
        {showHidden && (
          <HiddenStems
            branch={branchKeyForHidden}
            dayStem={dayStemKeyForHidden}
            mode={hiddenMode}       // "all" | "main"
            mapping={hiddenMapping} // "classic" | "hgc"
          />
        )}

        {/* 십신(지지) */}
        {sipSinBranch && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls}`}>
            {sipSinBranch}
          </div>
        )}

        {/* 운성/신살 텍스트 */}
        {settings.showSibiUnseong && !!unseongText && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls} text-nowrap`}>
            {unseongText}
          </div>
        )}
        {settings.showSibiSinsal && !!shinsalText && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls} text-nowrap`}>
            {shinsalText}
          </div>
        )}
      </div>
    </div>
  );
}
