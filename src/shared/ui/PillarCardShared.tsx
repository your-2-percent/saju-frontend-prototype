import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { HiddenStems } from "@/shared/domain/hidden-stem";
import type { Settings } from "@/shared/lib/hooks/useSettings";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import {
  isYinUnified,
  toDisplayChar,
  toHanjaBranch,
  toHanjaStem,
  toKoBranch,
  toKoStem,
} from "@/shared/domain/간지/convert";

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
  isUnknownTime = false
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
  isUnknownTime?: boolean;
}) {
  const { manualHour } = useHourPredictionStore();
  const showHyphen = isUnknownTime && !manualHour;

  const stem   = gz.charAt(0);
  const branch = gz.charAt(1);

  /* 표시 글자(사용자 설정 반영) */
  const stemDisp   = toDisplayChar(stem,   "stem",   settings.charType);
  const branchDisp = toDisplayChar(branch, "branch", settings.charType);

  /* 유틸/색상/십신용 키는 ‘한자’로 통일 */
  const stemKeyForUtil    = toHanjaStem(stem);
  const branchKeyForUtil  = toHanjaBranch(branch);
  const dayStemKeyForUtil = toHanjaStem(dayStem);   // 일간 → 한자 키

  /* HiddenStems용 키는 ‘한글’로 통일 */
  const branchKeyForHidden  = toKoBranch(branch);
  const dayStemKeyForHidden = toKoStem(dayStem);

  /* 십신 */
  const sipSinStem = settings.showSipSin
    ? getSipSin(dayStemKeyForUtil, { stem: stemKeyForUtil })
    : null;

  const sipSinBranch = (!hideBranchSipSin && settings.showSipSin)
    ? getSipSin(dayStemKeyForUtil, { branch: branchKeyForUtil })
    : null;

  /* 얇게 */
  const thinStemClass   = settings.thinEum && isYinUnified(stem, "stem")     ? "font-thin" : "font-bold";
  const thinBranchClass = settings.thinEum && isYinUnified(branch, "branch") ? "font-thin" : "font-bold";

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

  const stemBoxCls =
    showHyphen
      ? `bg-white ${boxBorderCls}` // 시간 모름 + 예측 없음 → 흰색
      : `${getElementColor(stemKeyForUtil, "stem", settingsObj)} ${boxBorderCls}`;

  const branchBoxCls =
    showHyphen
      ? `bg-white ${boxBorderCls}`
      : `${getElementColor(branchKeyForUtil, "branch", settingsObj)} ${boxBorderCls}`;

  // ✅ 텍스트 색상
  const stemTextCls = showHyphen
    ? "text-black"
    : settingsObj.difficultyMode
      ? settingsObj.theme === "light"
        ? "text-neutral-900"
        : "text-black"
      : "text-white";

  const branchTextCls = showHyphen
    ? "text-black"
    : settingsObj.difficultyMode
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
            {isUnknownTime && !manualHour ? "-" : sipSinStem}
          </div>
        )}

        {/* 천간 */}
        <div className={`${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border ${stemBoxCls}`}>
          <span className={`text-2xl md:text-3xl ${stemTextCls} ${thinStemClass}`}>
            {showHyphen ? "-" : stemDisp}
          </span>
        </div>

        {/* 지지 */}
        <div className={`${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border ${branchBoxCls}`}>
          <span className={`text-2xl md:text-3xl ${branchTextCls} ${thinBranchClass}`}>
            {showHyphen ? "-" : branchDisp}
          </span>
        </div>

        {/* 지장간 */}
        {showHidden && (
          <HiddenStems
            branch={branchKeyForHidden}
            dayStem={dayStemKeyForHidden}
            mode={hiddenMode}
            mapping={hiddenMapping}
            isUnknownTime={isUnknownTime && !manualHour && (label === "시주" || label === "일주")}
          />
        )}

        {/* 십신(지지) */}
        {sipSinBranch && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls}`}>
            {isUnknownTime && !manualHour ? "-" : sipSinBranch}
          </div>
        )}

        {/* 운성/신살 텍스트 */}
        {settings.showSibiUnseong && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls} text-nowrap`}>
            {isUnknownTime && !manualHour ? "-" : unseongText || ""}
          </div>
        )}
        {settings.showSibiSinsal && (
          <div className={`text-[10px] desk:text-xs ${extraTextCls} text-nowrap`}>
            {isUnknownTime && !manualHour ? "-" : shinsalText || ""}
          </div>
        )}
      </div>
    </div>
  );
}
