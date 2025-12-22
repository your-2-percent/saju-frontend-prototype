import { v4 as uuidv4 } from "uuid";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import type { DayBoundaryRule } from "@/shared/type";
import type { MyeongSik } from "@/shared/lib/storage";
import type { FormState, HourRule, MatchRow } from "../input/customSajuTypes";
import { HOUR_BRANCH_TO_TIME } from "../calc/ganjiRules";

export function buildCustomSajuPayload(params: {
  selectedRow: number | null;
  results: MatchRow[] | null;
  gender: "male" | "female";
  hourRule: HourRule;
  form: FormState;
  unknownPlace: boolean;
}) {
  const { selectedRow, results, gender, hourRule, form, unknownPlace } = params;
  const chosen = selectedRow !== null ? results?.filter((_, i) => i === selectedRow) ?? [] : [];
  if (chosen.length === 0) {
    return { error: "선택된 항목이 없습니다." as const };
  }

  const picked = chosen[0]!;
  const dayRule: DayBoundaryRule = hourRule === "자시" ? "조자시/야자시" : "인시";
  const [yy, mm, dd] = picked.date.split("-").map(Number);

  let hh = 0;
  let mi = 0;
  if (picked.hourSlots.length > 0) {
    const br = picked.hourSlots[0]!.branch;
    const t = HOUR_BRANCH_TO_TIME[br];
    if (t) {
      hh = t.hh;
      mi = t.mi;
    }
  }

  const dateObj = new Date(yy, mm - 1, dd, hh, mi);
  const corrected = dateObj;
  const correctedLocal = "";

  const genderK = gender === "male" ? "남자" : "여자";
  const dir = calcDaewoonDir(picked.year.charAt(0), genderK);

  const yGZ = getYearGanZhi(corrected, 127.5);
  const mGZ = getMonthGanZhi(corrected, 127.5);
  const dGZ = getDayGanZhi(corrected, dayRule);
  const hGZ = getHourGanZhi(corrected, dayRule);

  const ganjiText = [`원국: ${yGZ} ${mGZ} ${dGZ}`, hGZ ? `${hGZ}시` : null]
    .filter(Boolean)
    .join(" ");

  const payload: MyeongSik = {
    id: uuidv4(),
    name: "커스텀명식",
    birthDay: `${yy}${String(mm).padStart(2, "0")}${String(dd).padStart(2, "0")}`,
    birthTime: `${String(hh).padStart(2, "0")}${String(mi).padStart(2, "0")}`,
    gender: genderK,
    birthPlace: unknownPlace
      ? { name: "커스텀명식", lat: 0, lon: 127.5 }
      : (form.birthPlace ?? { name: "커스텀명식", lat: 0, lon: 127.5 }),
    relationship: form.relationship ?? "",
    memo: form.memo ?? "",
    folder: normalizeFolderValue(form.folder),

    mingSikType: form.mingSikType ?? "조자시/야자시",
    DayChangeRule: form.mingSikType === "인시" ? "인시일수론" : "자시일수론",
    calendarType: form.calendarType ?? "solar",

    ganjiText: `원국: ${picked.year} ${picked.month} ${picked.day} ${picked.hour}`,
    ganji: ganjiText,
    dayStem: picked.day.charAt(0),

    dateObj,
    corrected,
    correctedLocal,
    dir,
    favorite: false,
  };

  return { payload };
}

function calcDaewoonDir(yearStem: string, genderK: string): "forward" | "backward" {
  const yangStems = ["갑", "병", "무", "경", "임", "甲", "丙", "戊", "庚", "壬"];
  const isYang = yangStems.includes(yearStem);
  const isMale = genderK === "남자";
  return isYang ? (isMale ? "forward" : "backward") : (isMale ? "backward" : "forward");
}
