import type { CSSProperties } from "react";
import { isDST } from "@/shared/lib/core/timeCorrection";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";
import { formatLocalHM } from "@/shared/utils";

type UseMyeongsikCardCalcArgs = {
  m: MyeongSik;
  memoOpen: boolean;
  isDragDisabled: boolean;
  canManage: boolean;
};

type MyeongsikCardCalc = {
  keyId: string;
  locked: boolean;
  lockMsg: string;
  dragDisabled: boolean;
  dragHandleLabel: string;
  ganji: string;
  placeDisplay: string;
  relationshipLabel: string;
  genderLabel: string;
  birthDisplay: string;
  calendarLabel: string;
  correctedLabel: string;
  showMetaLine: boolean;
  showMemo: boolean;
  memoToggleLabel: string;
  age: number;
  mingSikTypeValue: DayBoundaryRule;
  favoriteLabel: string;
  editLabel: string;
  deleteLabel: string;
  getDragStyle: (base?: CSSProperties) => CSSProperties;
};

const UNKNOWN_TIME = "모름";

function formatBirthDisplay(yyyymmdd: string, hhmm?: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  if (hhmm && /^\d{4}$/.test(hhmm)) {
    return `${y}년 ${m}월 ${d}일생 ${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
  }
  if (hhmm === UNKNOWN_TIME) return `${y}년 ${m}월 ${d}일생 (시간 모름)`;
  return `${y}년 ${m}월 ${d}일생`;
}

function formatPlaceDisplay(name?: string): string {
  if (!name || name === "모름") return "";
  const parts = name.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return "";
  const hasLevel = (suffixes: string[]) => parts.find((p) => suffixes.some((s) => p.endsWith(s)));
  const upper = hasLevel(["도", "특별시", "광역시", "자치시", "특별자치시"]);
  const lower = hasLevel(["시", "군", "구", "읍", "면", "리"]);
  const isCountryOnly =
    parts.length === 1 ||
    (!hasLevel(["도", "특별시", "광역시", "자치시", "특별자치시", "시", "군", "구", "읍", "면", "리"]) &&
      !hasLevel(["주", "연방", "현", "성", "주도", "자치주"]));
  if (isCountryOnly) return name;
  if (upper && lower) return `${upper} ${lower}`;
  if (upper) return upper;
  return name;
}

function formatCorrectedDisplay(
  correctedLocal: string | null | undefined,
  corrected: Date,
  isUnknownTime: boolean
): string {
  if (isUnknownTime) return UNKNOWN_TIME;
  const local = (correctedLocal ?? "").trim();
  if (local) return local;
  const dt = corrected instanceof Date ? corrected : new Date(corrected);
  if (Number.isNaN(dt.getTime())) return "";
  return formatLocalHM(dt);
}

function getGanjiString(m: MyeongSik): string {
  return (m.ganji ?? "").replace(/\r\n/g, "\n").replace(/\s*null\s*/gi, "").trim();
}

function getSidebarGanjiWithDST(m: MyeongSik): string {
  const fallback = getGanjiString(m);
  const raw = String(m.birthDay ?? "").trim();
  if (!/^\d{8}$/.test(raw)) return fallback;

  const y = Number(raw.slice(0, 4));
  const mo = Number(raw.slice(4, 6));
  const da = Number(raw.slice(6, 8));

  if (!isDST(y, mo, da)) return fallback;
  if (!m.birthTime || m.birthTime === UNKNOWN_TIME) return fallback;

  const hh = Number(m.birthTime.slice(0, 2));
  const mm = m.birthTime.slice(2, 4);
  const newH = hh - 1 < 0 ? 23 : hh - 1;
  const nextBirthTime = String(newH).padStart(2, "0") + mm;

  const baseCorrected = m.corrected instanceof Date ? m.corrected : new Date(m.corrected);
  if (Number.isNaN(baseCorrected.getTime())) return fallback;

  const correctedForGanji = new Date(baseCorrected.getTime() - 60 * 60 * 1000);

  const snapshot = recalcGanjiSnapshot({
    ...m,
    birthTime: nextBirthTime,
    corrected: correctedForGanji,
  });

  return getGanjiString({ ...m, ...snapshot });
}

function parseBirthYear(birthDay: string | undefined): number {
  const raw = String(birthDay ?? "").trim();
  if (/^\d{8}$/.test(raw)) {
    const y = Number(raw.slice(0, 4));
    return Number.isFinite(y) ? y : NaN;
  }
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return NaN;
  return dt.getFullYear();
}

function koreanAgeByYear(birthYear: number, targetYear: number): number {
  if (Number.isNaN(birthYear)) return 0;
  return targetYear - birthYear + 1;
}

function getDragStyle(base?: CSSProperties): CSSProperties {
  return {
    ...base,
    transition: base?.transform ? "transform 0.15s ease" : "none",
  };
}

function formatGenderLabel(gender?: string | null): string {
  if (gender === "남자") return "남자";
  if (gender === "여자") return "여자";
  return gender ?? "";
}

export function useMyeongsikCardCalc({
  m,
  memoOpen,
  isDragDisabled,
  canManage,
}: UseMyeongsikCardCalcArgs): MyeongsikCardCalc {
  const lockMsg = "이건 PRO 버전에서만 가능해요.";
  const locked = !canManage;
  const dragDisabled = isDragDisabled || locked;
  const keyId = `item:${m.id}`;

  const ganji = getSidebarGanjiWithDST(m);
  const placeDisplay = formatPlaceDisplay(m.birthPlace?.name);
  const relationshipLabel = m.relationship?.trim() ? m.relationship : "관계 미선택";
  const genderLabel = formatGenderLabel(m.gender);

  const isUnknownTime = !m.birthTime || m.birthTime === UNKNOWN_TIME;
  const correctedLabel = formatCorrectedDisplay(m.correctedLocal, m.corrected, isUnknownTime);
  const showMetaLine = Boolean(placeDisplay || correctedLabel);

  const birthDisplay = formatBirthDisplay(m.birthDay, m.birthTime);
  const calendarLabel = m.calendarType === "lunar" ? "음력" : "양력";

  const birthYear = parseBirthYear(m.birthDay);
  const age = koreanAgeByYear(birthYear, new Date().getFullYear());

  const showMemo = Boolean(m.memo && m.memo.trim() !== "");
  const memoToggleLabel = memoOpen ? "메모 닫기" : "메모 열기";

  const mingSikTypeValue = (m.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const dragHandleLabel = locked ? "잠금" : dragDisabled ? "이동 불가" : "::";

  const favoriteLabel = m.favorite ? "즐겨찾기 해제" : "즐겨찾기";
  const editLabel = locked ? "수정 불가" : "수정";
  const deleteLabel = locked ? "삭제 불가" : "삭제";

  return {
    keyId,
    locked,
    lockMsg,
    dragDisabled,
    dragHandleLabel,
    ganji,
    placeDisplay,
    relationshipLabel,
    genderLabel,
    birthDisplay,
    calendarLabel,
    correctedLabel,
    showMetaLine,
    showMemo,
    memoToggleLabel,
    age,
    mingSikTypeValue,
    favoriteLabel,
    editLabel,
    deleteLabel,
    getDragStyle,
  };
}
