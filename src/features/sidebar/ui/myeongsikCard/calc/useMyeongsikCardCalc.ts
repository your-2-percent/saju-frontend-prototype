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
  canManage: boolean; // ✅ 호출부 호환용(여기서는 안 씀)
};

type MyeongsikCardCalc = {
  keyId: string;
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

function shiftHHMMMinus1(v: string): string | null {
  const s = v.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  const nextH = hh - 1 < 0 ? 23 : hh - 1;
  return `${String(nextH).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function getCorrectedLabelWithDST(m: MyeongSik, isUnknownTime: boolean): string {
  if (isUnknownTime) return UNKNOWN_TIME;

  const rawDay = String(m.birthDay ?? "").trim();
  const local = String(m.correctedLocal ?? "").trim();

  const baseCorrected =
    m.corrected instanceof Date ? m.corrected : new Date(String(m.corrected ?? ""));

  const baseValid = !Number.isNaN(baseCorrected.getTime());

  // 기존 표시 규칙(= correctedLocal 우선) 그대로 fallback으로 잡아두고
  const fallback = local ? local : baseValid ? formatLocalHM(baseCorrected) : "";

  // DST 적용 조건이 안 맞으면 그대로
  if (!/^\d{8}$/.test(rawDay)) return fallback;

  const y = Number(rawDay.slice(0, 4));
  const mo = Number(rawDay.slice(4, 6));
  const da = Number(rawDay.slice(6, 8));

  if (!isDST(y, mo, da)) return fallback;
  if (!m.birthTime || m.birthTime === UNKNOWN_TIME) return fallback;

  // ✅ DST 날짜면 보정시각도 -1시간 해서 보여주기
  if (baseValid) {
    const shifted = new Date(baseCorrected.getTime() - 60 * 60 * 1000);
    return formatLocalHM(shifted);
  }

  // Date가 깨져있을 때만 로컬 문자열에서 -1h 시도
  const shiftedLocal = shiftHHMMMinus1(local);
  return shiftedLocal ?? fallback;
}

export function useMyeongsikCardCalc({
  m,
  memoOpen,
  isDragDisabled,
}: UseMyeongsikCardCalcArgs): MyeongsikCardCalc {
  // ✅ 잠금 로직 제거: 드래그 비활성은 “외부에서 준 값”만 따른다
  const dragDisabled = isDragDisabled;
  const keyId = `item:${m.id}`;

  const ganji = getSidebarGanjiWithDST(m);
  const placeDisplay = formatPlaceDisplay(m.birthPlace?.name);
  const relationshipLabel = m.relationship?.trim() ? m.relationship : "관계 미선택";
  const genderLabel = formatGenderLabel(m.gender);

  const isUnknownTime = !m.birthTime || m.birthTime === UNKNOWN_TIME;
  const correctedLabel = getCorrectedLabelWithDST(m, isUnknownTime);
  const showMetaLine = Boolean(placeDisplay || correctedLabel);

  const birthDisplay = formatBirthDisplay(m.birthDay, m.birthTime);
  const calendarLabel = m.calendarType === "lunar" ? "음력" : "양력";

  const birthYear = parseBirthYear(m.birthDay);
  const age = koreanAgeByYear(birthYear, new Date().getFullYear());

  const showMemo = Boolean(m.memo && m.memo.trim() !== "");
  const memoToggleLabel = memoOpen ? "메모 닫기" : "메모 열기";

  const mingSikTypeValue = (m.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const dragHandleLabel = dragDisabled ? "이동 불가" : "::";

  const favoriteLabel = m.favorite ? "즐겨찾기 해제" : "즐겨찾기";
  const editLabel = "수정";
  const deleteLabel = "삭제";

  return {
    keyId,
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
