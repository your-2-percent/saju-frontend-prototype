// features/CustomSaju/CustomSajuModal.tsx
import { flushSync } from "react-dom";
import { v4 as uuidv4 } from "uuid";
import { getElementColor } from "@/shared/domain/간지/utils";
import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { 시주매핑_자시, 시주매핑_인시 } from "@/shared/domain/간지/const";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { 간지_MAP } from "@/shared/domain/간지/const";

// 프로젝트 규격에 맞춰 필요시 조정
type DayBoundaryRule = "자시" | "조자시/야자시" | "인시";

type Pillars = {
  yearStem?: Stem;  yearBranch?: Branch;
  monthStem?: Stem; monthBranch?: Branch;
  dayStem?: Stem;   dayBranch?: Branch;
  hourStem?: Stem;  hourBranch?: Branch;
};

type Stem = typeof 간지_MAP.천간[number];
type Branch = typeof 간지_MAP.지지[number];

type HourRule = "자시" | "인시";

// 고정 시간대(자→해)
const TIME_WINDOWS: readonly string[] = [
  "23:00–00:59","01:00–02:59","03:00–04:59","05:00–06:59",
  "07:00–08:59","09:00–10:59","11:00–12:59","13:00–14:59",
  "15:00–16:59","17:00–18:59","19:00–20:59","21:00–22:59",
] as const;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function pillarOf(stem?: Stem, branch?: Branch): string | null {
  return stem && branch ? `${stem}${branch}` : null;
}
function isFilledAll(p: Pillars): p is Required<Pillars> {
  return !!(p.yearStem && p.yearBranch && p.monthStem && p.monthBranch &&
            p.dayStem && p.dayBranch && p.hourStem && p.hourBranch);
}

/* ── 월두(연간→월주 후보) : 계산 함수 없이 연간만으로 처리 ── */
const STEM_INDEX: Record<Stem, number> = { 갑:0, 을:1, 병:2, 정:3, 무:4, 기:5, 경:6, 신:7, 임:8, 계:9 };
const INDEX_STEM = 간지_MAP.천간;
const MONTH_SEQ_FROM_IN: Branch[] = ["인","묘","진","사","오","미","신","유","술","해","자","축"];
// --- 월두법: 年干 + 月支 -> 月干 계산 (인시 기준 전용)
function monthStemOf(yearStem: Stem, monthBranch: Branch): Stem {
  // 인월(寅月) 기준: 연간에 따른 월간 시퀀스
  let base: Stem;
  if (yearStem === "갑" || yearStem === "기") base = "병";
  else if (yearStem === "을" || yearStem === "경") base = "무";
  else if (yearStem === "병" || yearStem === "신") base = "경";
  else if (yearStem === "정" || yearStem === "임") base = "임";
  else base = "갑"; // 무/계년

  const baseIdx = STEM_INDEX[base];
  const offset = MONTH_SEQ_FROM_IN.indexOf(monthBranch); // 寅=0, 묘=1 …
  const idx = (baseIdx + (offset >= 0 ? offset : 0)) % 10;
  return INDEX_STEM[idx];
}

/* ── 시두(일간→시주) : 브랜치-맵으로 매칭 정확화 ── */
const ORDER_JASI: Branch[] = 간지_MAP.지지.slice(); // ["자","축","인",...,"해"]
const ORDER_INSI: Branch[] = ["인","묘","진","사","오","미","신","유","술","해","자","축"];

/** 일간/규칙에 따른 {branch -> "간지"} 맵 */
function buildHourMap(dayStem: Stem, rule: HourRule): Record<Branch, string> {
  const table = rule === "자시" ? 시주매핑_자시 : 시주매핑_인시;
  const arr = table[dayStem] as readonly string[]; // 길이 12
  const order = rule === "자시" ? ORDER_JASI : ORDER_INSI;
  const map: Record<Branch, string> = 간지_MAP.지지.reduce((acc, b) => {
    acc[b] = "";
    return acc;
  }, {} as Record<Branch, string>);
  for (let i = 0; i < 12; i++) map[order[i]] = arr[i];
  return map;
}

const STEM_YIN_YANG: Record<Stem,"양"|"음"> = {
  갑:"양", 을:"음", 병:"양", 정:"음", 무:"양",
  기:"음", 경:"양", 신:"음", 임:"양", 계:"음",
};
const BRANCH_YIN_YANG: Record<Branch,"양"|"음"> = {
  자:"양", 축:"음", 인:"양", 묘:"음", 진:"양",
  사:"음", 오:"양", 미:"음", 신:"양", 유:"음",
  술:"양", 해:"음",
};

type MatchRow = {
  date: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  hourSlots: { branch: Branch; time: string }[];
};
type CalendarType = "solar" | "lunar";
type FormState = Partial<MyeongSik> & { calendarType: CalendarType; };

export default function CustomSajuModal({
  open,
  onClose,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: MyeongSik) => void;
}) {
  const { settings: settingsObj } = useSettingsStore();

  const [monthBranchChoices, setMonthBranchChoices] = useState<Branch[] | null>(null);
  const [pillars, setPillars] = useState<Pillars>({});
  const [active, setActive] = useState<keyof Pillars | null>(null);

  // 월두/시두 토글
  const [useWoldu, setUseWoldu] = useState<boolean>(true);
  const [useSiju, setUseSiju] = useState<boolean>(true);

  const [hourRule, setHourRule] = useState<HourRule>("자시");
  const [gender, setGender] = useState<"male"|"female">("male");

  const [results, setResults] = useState<MatchRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [/*error*/, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    gender: "남자",
    mingSikType: "조자시/야자시",
    DayChangeRule: "자시일수론",
    calendarType: "solar",
  });
  const [unknownPlace, setUnknownPlace] = useState(false);

  // ✅ 토스트
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const [showToast4, setShowToast] = useState(false);
  const [searchToast, setSearchToast] = useState(false);

  useEffect(() => {
    if (showToast4) {
      const timer = setTimeout(() => setShowToast(false), 2000); // 2초 후 사라짐
      return () => clearTimeout(timer);
    }
  }, [showToast4]);

  useEffect(() => {
    if (searchToast) {
      const timer = setTimeout(() => setSearchToast(false), 2000); // 2초 후 사라짐
      return () => clearTimeout(timer);
    }
  }, [searchToast]);

  const handleSave = () => {
  const chosen =
    selectedRow !== null ? results?.filter((_, i) => i === selectedRow) ?? [] : [];

  if (chosen.length === 0) {
    alert("선택된 항목이 없습니다.");
    return;
  }

  const dayRule: DayBoundaryRule = hourRule === "자시" ? "조자시/야자시" : "인시";

  // 하나만 저장한다고 가정 (여러 개 처리하려면 map으로 돌리면 됨)
  const picked = chosen[0];

  // 날짜 → YYYYMMDD 포맷
  const [yy, mm, dd] = picked.date.split("-").map(Number);

  const HOUR_BRANCH_TO_TIME: Record<Branch, {hh: number; mi: number}> = {
    자: { hh: 0,  mi: 0 },   // 00:00
    축: { hh: 2,  mi: 0 },   // 02:00
    인: { hh: 4,  mi: 0 },   // 04:00
    묘: { hh: 6,  mi: 0 },   // 06:00
    진: { hh: 8,  mi: 0 },   // 08:00
    사: { hh: 10, mi: 0 },   // 10:00
    오: { hh: 12, mi: 0 },   // 12:00
    미: { hh: 14, mi: 0 },   // 14:00
    신: { hh: 16, mi: 0 },   // 16:00
    유: { hh: 18, mi: 0 },   // 18:00
    술: { hh: 20, mi: 0 },   // 20:00
    해: { hh: 22, mi: 0 },   // 22:00
  };

  let hh = 0, mi = 0;
  if (picked.hourSlots.length > 0) {
    const br = picked.hourSlots[0].branch as Branch;
    const t = HOUR_BRANCH_TO_TIME[br];
    if (t) {
      hh = t.hh;
      mi = t.mi;
    }
  }
  const dateObj = new Date(yy, mm - 1, dd, hh, mi);
  const corrected = new Date(dateObj.getTime() - 30 * 60000);
  const correctedLocal = corrected.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 성별
  const genderK = gender === "male" ? "남" : "여";

  // 순/역행 계산
  function calcDaewoonDir(yearStem: string, genderK: string): "forward" | "backward" {
    const yangStems = ["甲","丙","戊","庚","壬","갑","병","무","경","임"];
    const isYang = yangStems.includes(yearStem);
    const isMale = genderK === "남";
    return isYang ? (isMale ? "forward" : "backward")
                  : (isMale ? "backward" : "forward");
  }
  const dir = calcDaewoonDir(picked.year.charAt(0), genderK);

  const yGZ = getYearGanZhi(corrected, 127.5);
  const mGZ = getMonthGanZhi(corrected, 127.5);
  const dGZ = getDayGanZhi(corrected, dayRule);
  const hGZ = getHourGanZhi(corrected, dayRule);

  const ganjiText = [`원국 : ${yGZ}년 ${mGZ}월 ${dGZ}일`, hGZ ? `${hGZ}시` : null]
      .filter(Boolean)
      .join(" ");

  // 최종 payload
  const payload: MyeongSik & Partial<Record<"yearGZ"|"monthGZ"|"dayGZ"|"hourGZ", string>> = {
    id: uuidv4(),
    name: "커스텀명식",
    birthDay: `${yy}${String(mm).padStart(2,"0")}${String(dd).padStart(2,"0")}`,
    birthTime: `${String(hh).padStart(2,"0")}${String(mi).padStart(2,"0")}`,
    gender: genderK,
    birthPlace: unknownPlace
      ? { name: "커스텀명식", lat: 0, lon: 127.5 }
      : (form.birthPlace ?? { name: "커스텀명식", lat: 0, lon: 127.5 }),
    relationship: form.relationship ?? "",
    memo: form.memo ?? "",
    folder: normalizeFolderValue(form.folder),

    mingSikType: form.mingSikType ?? "조자시/야자시",
    DayChangeRule: (form.mingSikType === "인시") ? "인시일수론" : "자시일수론",
    calendarType: form.calendarType ?? "solar",

    // 간지 (검색 결과 기반)
    yearGZ: picked.year,
    monthGZ: picked.month,
    dayGZ: picked.day,
    hourGZ: picked.hour,

    ganjiText: `원국 : ${picked.year}년 ${picked.month}월 ${picked.day}일 ${picked.hour}시`,
    ganji: ganjiText,
    dayStem: picked.day.charAt(0),

    // 새로 채운 필드
    dateObj,
    corrected,
    correctedLocal,
    dir,
  };

  // 현재 선택 + 목록에 추가
  flushSync(() => {
    const store = useMyeongSikStore.getState();
    store.add(payload);        // 🔹 새 명식 저장
  });

  // 외부 콜백
  onSave(payload);

  setToast("저장 완료!");
  setForm({ gender: "남자", mingSikType: "조자시/야자시", calendarType: "solar" });
  setUnknownPlace(false);

  onClose();
};

  // 월두/시두 사용 시: 연주 또는 일주부터
  const needStartFromYearOrDay = useWoldu || useSiju;
  const hasYear = !!(pillars.yearStem && pillars.yearBranch);
  const hasDay  = !!(pillars.dayStem && pillars.dayBranch);
  const canEnterOthers = !needStartFromYearOrDay || hasYear || hasDay;

  // 활성 타입
  const activeIsStem = !!active && active.endsWith("Stem");
  const activeIsBranch = !!active && active.endsWith("Branch");

  function counterpartKey(key: keyof Pillars): keyof Pillars {
    if (key === "yearStem") return "yearBranch";
    if (key === "yearBranch") return "yearStem";
    if (key === "monthStem") return "monthBranch";
    if (key === "monthBranch") return "monthStem";
    if (key === "dayStem") return "dayBranch";
    if (key === "dayBranch") return "dayStem";
    if (key === "hourStem") return "hourBranch";
    return "hourStem";
  }

  // ✅ 월두 자동완성: 무조건 "인시" 매핑 사용 + '무엇을 바꿨는지' 기준으로 반대편 보정
  const applyWoldu = useCallback((p: Pillars, changed?: keyof Pillars): Pillars => {
    if (!useWoldu || !p.yearStem) return p;
    const n = { ...p };

    // 연간 기반 12개월(寅→…→丑), 시주매핑_인시 재사용
    const arr = 시주매핑_인시[p.yearStem]; // 예: ["병인","정묘",...,"정축"]
    if (!arr) return n;

    const byStem   = (s: Stem)   => arr.filter(gz => gz.startsWith(s));
    const byBranch = (b: Branch) => arr.find(gz => gz.endsWith(b));

    // ▸ 월간을 방금 변경 ⇒ 해당 월간을 갖는 월지 후보(보통 2개) 제시
    if (changed === "monthStem" && n.monthStem) {
      const hits = byStem(n.monthStem).map(gz => gz.slice(1) as Branch);
      if (hits.length >= 2) {
        setMonthBranchChoices(hits.slice(0, 2));   // 후보 2개 노출
        setActive("monthBranch");                  // 월지로 포커스 이동
        // 월지는 아직 확정 안 함 (사용자 선택 대기)
        return n;
      }
      if (hits.length === 1) {
        n.monthBranch = hits[0];
        setMonthBranchChoices(null);
        return n;
      }
      return n;
    }

    // ▸ 월지를 방금 변경 ⇒ 그 월지에 맞는 월간 자동
    if (changed === "monthBranch" && n.monthBranch) {
      const hit = byBranch(n.monthBranch);
      if (hit) {
        n.monthStem = hit.slice(0, 1) as Stem;
        setMonthBranchChoices(null);
      }
      return n;
    }

    // ▸ 연간을 방금 변경 ⇒ 현재 입력돼있는 쪽을 기준으로 반대편 재보정
    if (changed === "yearStem") {
      if (n.monthStem && !n.monthBranch) {
        const hits = byStem(n.monthStem).map(gz => gz.slice(1) as Branch);
        if (hits.length >= 2) {
          setMonthBranchChoices(hits.slice(0, 2));
          setActive("monthBranch");
          return n;
        }
        if (hits.length === 1) n.monthBranch = hits[0];
      } else if (n.monthBranch && !n.monthStem) {
        const hit = byBranch(n.monthBranch);
        if (hit) n.monthStem = hit.slice(0, 1) as Stem;
      }
    }

    return n;
  }, [useWoldu, setActive]);


  // ✅ 시두 자동완성: 무조건 "인시" 매핑 사용 + '무엇을 바꿨는지' 기준으로 반대편 보정
  const applySiju = useCallback((p: Pillars, changed?: keyof Pillars): Pillars => {
    if (!useSiju || !p.dayStem) return p;
    const n = { ...p };

    const map = buildHourMap(p.dayStem, hourRule); // 자/인시 기준 반영
    const byStem   = (s: Stem)   => (Object.entries(map) as [Branch,string][])
                                    .find(([, gz]) => gz.startsWith(s));
    const byBranch = (b: Branch) => map[b];

    // ▸ 시간을(천간) 방금 변경 ⇒ 그 시간간에 맞는 시지 자동
    if (changed === "hourStem" && n.hourStem) {
      const hit = byStem(n.hourStem);
      if (hit) n.hourBranch = hit[0];
      return n;
    }

    // ▸ 시지를 방금 변경 ⇒ 그 시지에 맞는 시간간 자동
    if (changed === "hourBranch" && n.hourBranch) {
      const gz = byBranch(n.hourBranch);
      if (gz) n.hourStem = gz.slice(0, 1) as Stem;
      return n;
    }

    // ▸ 일간을 방금 변경 ⇒ 현재 입력돼있는 쪽으로 반대편 재보정
    if (changed === "dayStem") {
      if (n.hourStem && !n.hourBranch) {
        const hit = byStem(n.hourStem);
        if (hit) n.hourBranch = hit[0];
      } else if (n.hourBranch && !n.hourStem) {
        const gz = byBranch(n.hourBranch);
        if (gz) n.hourStem = gz.slice(0, 1) as Stem;
      }
    }

    return n;
  }, [useSiju, hourRule]);

  /* ── 규칙 위반 검사 ── */
  const violatesWoldu = useCallback((p: Pillars): boolean => {
    if (!useWoldu || !p.yearStem) return false;
    if (p.monthBranch && p.monthStem) {
      return monthStemOf(p.yearStem, p.monthBranch) !== p.monthStem;
    }
    return false;
  }, [useWoldu]);

  const violatesSiju = useCallback((p: Pillars): boolean => {
    if (!useSiju || !p.dayStem) return false;
    if (p.hourBranch && p.hourStem) {
      const map = buildHourMap(p.dayStem, hourRule);
      const gz = map[p.hourBranch];
      if (!gz) return false;
      return gz.slice(0,1) !== p.hourStem;
    }
    return false;
  }, [useSiju, hourRule]);

  useEffect(() => {
    if (!useSiju || !pillars.dayStem || !pillars.hourBranch) return;
    if (pillars.hourBranch === "자" || pillars.hourBranch === "축") {
      const map = buildHourMap(pillars.dayStem, hourRule);
      const gz = map[pillars.hourBranch];
      if (gz) setPillars(prev => ({ ...prev, hourStem: gz.slice(0,1) as Stem }));
    }
  }, [hourRule, useSiju, pillars.dayStem, pillars.hourBranch]);

  /* ── 선택 처리 ── */
  const handleSelect = useCallback((value: string) => {
    if (!active) return;

    // 월두/시두 사용 시: 연/일 먼저
    const targetIsYearOrDay =
      active === "yearStem" || active === "yearBranch" ||
      active === "dayStem"  || active === "dayBranch";
    if (!canEnterOthers && !targetIsYearOrDay) {
      setError("월/시두법 사용 중: 연주 또는 일주부터 입력하세요.");
      setTimeout(() => setError(null), 1500);
      return;
    }

    // 1) 값 반영
    let next: Pillars = { ...pillars, [active]: value } as Pillars;

    // 🔧 변경된 키(active)를 넘겨서, 천간/지지 어느 쪽을 바꿨는지 알려줌
    if (active === "yearStem" || active === "monthStem" || active === "monthBranch") {
      next = applyWoldu(next, active);
    }
    if (active === "dayStem" || active === "hourStem" || active === "hourBranch") {
      next = applySiju(next, active);
    }

    setPillars(next);

    // 3) 규칙 위반 시 토스트 + 체크 해제
    let turnedOff = false;
    if (violatesWoldu(next)) {
      setUseWoldu(false);
      turnedOff = true;
    }
    if (violatesSiju(next)) {
      setUseSiju(false);
      turnedOff = true;
    }
    if (turnedOff) showToast("월/시두법에 맞지 않습니다. 체크가 해제 됩니다.");

    // 4) 상태 반영
    setPillars(next);
    setResults(null);

    // 5) 반대편 자동 포커스
    const counter = counterpartKey(active);
    setActive(counter);

    // 6) 기둥 완료 시 다음 기둥
    setTimeout(() => {
      const p = { ...next };
      if (p.yearStem && p.yearBranch && !p.monthStem) { setActive("monthStem"); return; }
      if (p.monthStem && p.monthBranch && !p.dayStem) { setActive("dayStem"); return; }
      if (p.dayStem && p.dayBranch && !p.hourStem)   { setActive("hourStem"); return; }
    }, 0);
  }, [active, pillars, canEnterOthers, applyWoldu, applySiju, violatesWoldu, violatesSiju]);

  const filledAll = isFilledAll(pillars);

  /* ── 검색 ── */
  const doSearch = useCallback(async () => {
    setResults(null);
    setError(null);
    if (!isFilledAll(pillars)) {
      setError("연·월·일·시 간지를 모두 선택하세요.");
      return;
    }

    const targetYear = pillarOf(pillars.yearStem, pillars.yearBranch)!;
    const targetMonth = pillarOf(pillars.monthStem, pillars.monthBranch)!;
    const targetDay = pillarOf(pillars.dayStem, pillars.dayBranch)!;
    const targetHour = pillarOf(pillars.hourStem, pillars.hourBranch)!;

    const MAX_ROWS = 300;
    const out: MatchRow[] = [];

    setSearching(true);
    try {
      const start = new Date(1900, 0, 1, 12, 0, 0);
      const end   = new Date(2100,11,31,12, 0, 0);

      for (let t = start.getTime(); t <= end.getTime(); t += 24*3600*1000) {
        const d = new Date(t);
        const dayRule: DayBoundaryRule = hourRule === "자시" ? "조자시/야자시" : "인시";

        const yGZ = getYearGanZhi(d);
        if (yGZ !== targetYear) continue;

        const mGZ = getMonthGanZhi(d); // 월주는 rule 없이 고정
        if (mGZ !== targetMonth) continue;

        const ddGZ = getDayGanZhi(d, dayRule); // 일주는 자/인시 분기
        if (ddGZ !== targetDay) continue;

        // 시주 후보(브랜치 맵으로 정확 체크)
        const hourMap = buildHourMap(pillars.dayStem!, hourRule);
        const slots: { branch: Branch; time: string }[] = [];
        for (let i = 0; i < 12; i++) {
          const br = 간지_MAP.지지[i];
          if (hourMap[br] === targetHour) {
            slots.push({ branch: br, time: TIME_WINDOWS[i] });
          }
        }
        if (slots.length === 0) continue;

        out.push({
          date: ymd(d),
          year: yGZ, month: mGZ, day: ddGZ, hour: targetHour,
          hourSlots: slots
        });

        if (out.length >= MAX_ROWS) break;
      }

      if (out.length === 0) setError("일치하는 날짜가 없습니다. (범위: 1900–2100)");
      setResults(out);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else setError(String(e));
    } finally {
      setSearching(false);
    }
  }, [pillars, hourRule]);

  const clearAll = () => {
    setPillars({});
    setResults(null);
    setError(null);
    setActive(null);
  };

  // 선택 패널: 활성 전에는 숨김 + 안내
  //const showStems = !!active && activeIsStem;
  //const showBranches = !!active && activeIsBranch;

  /* ── 토글 핸들러 (재체크 시 지지 기준 보정) ── */
  const onToggleWoldu = (checked: boolean) => {
    setResults(null);
    if (checked) {
      // 재체크 시: 지지 기준으로 보정
      setPillars(prev => {
        const n = { ...prev };
        if (n.yearStem && n.monthBranch) n.monthStem = monthStemOf(n.yearStem, n.monthBranch);
        return n;
      });
    }
    setUseWoldu(checked);
  };
  const onToggleSiju = (checked: boolean) => {
    setResults(null);
    if (checked) {
      setPillars(prev => {
        const n = { ...prev };
        if (n.dayStem && n.hourBranch) {
          const map = buildHourMap(n.dayStem, hourRule);
          const gz = map[n.hourBranch];
          if (gz) n.hourStem = gz.slice(0,1) as Stem;
        }
        return n;
      });
    }
    setUseSiju(checked);
  };

  if (!open) return null;

  const onChangeHourRule = (rule: HourRule) => {
    setResults(null);
    setHourRule(rule);
    // 자/축일 때 즉시 시간간 갱신 (시두 켜져 있고 일간/시지 확정되어 있을 때만)
    if (useSiju && pillars.dayStem && pillars.hourBranch && (pillars.hourBranch === "자" || pillars.hourBranch === "축")) {
      const map = buildHourMap(pillars.dayStem, rule);
      const gz = map[pillars.hourBranch];
      if (gz) {
        setPillars(prev => ({ ...prev, hourStem: gz.slice(0,1) as Stem }));
      }
    }
  };

  

  return (
    <div className="fixed min-w-[320px] inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white max-w-[360px] dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-5xl p-4 relative">
        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">커스텀 명식 만들기</h2>

        {/* 옵션 */}
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div>
            <p className="font-medium mb-2">월/시두법</p>
            <span className="mr-3 chkContainer">
              <input
                type="checkbox"
                id="useWoldu"
                checked={useWoldu}
                onChange={(e) => onToggleWoldu(e.target.checked)}
              />
              <label htmlFor="useWoldu" className="ml-1">월두법 사용</label>
            </span>
            <span className="chkContainer">
              <input
                type="checkbox"
                id="useSidu"
                checked={useSiju}
                onChange={(e) => onToggleSiju(e.target.checked)}
              />
              <label htmlFor="useSidu" className="ml-1">시두법 사용</label>
            </span>
          </div>

          <div>
            <p className="font-medium mb-2">시간 기준</p>
            <span className="mr-3 chkContainer">
              <input
                type="radio"
                id="jasi"
                checked={hourRule === "자시"}
                onChange={() => (onChangeHourRule("자시"))}
              />
              <label htmlFor="jasi" className="ml-1">자시</label>
            </span>
            <span className="chkContainer">
              <input
                type="radio"
                id="insi"
                checked={hourRule === "인시"}
                onChange={() => (onChangeHourRule("인시"))}
              />
              <label htmlFor="insi" className="ml-1">인시</label>
            </span>
          </div>

          <div>
            <p className="font-medium mb-2">성별</p>
            <span className="mr-3 chkContainer">
              <input
                type="radio"
                id="male"
                checked={gender === "male"}
                onChange={() => setGender("male")}
              />
              <label htmlFor="male" className="ml-1">남</label>
            </span>
            <span className="chkContainer">
              <input
                type="radio"
                id="female"
                checked={gender === "female"}
                onChange={() => setGender("female")}
              />
              <label htmlFor="female" className="ml-1">여</label>
            </span>
          </div>
        </div>

        {/* 안내 */}
        {needStartFromYearOrDay && !canEnterOthers && (
          <div className="mb-3 text-sm text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30 rounded p-2 text-center">
            월/시두법 사용 중입니다. <br /><b>연주</b> 또는 <b>일주</b>부터 먼저 입력하세요.
          </div>
        )}

        {/* 8칸 입력 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {([
            ["hourStem","시간"],["dayStem","일간"],["monthStem","월간"],["yearStem","연간"],
            ["hourBranch","시지"],["dayBranch","일지"],["monthBranch","월지"],["yearBranch","연지"],
          ] as const).map(([key,label]) => {
            const disabled = !canEnterOthers &&
              !(key === "yearStem" || key === "yearBranch" || key === "dayStem" || key === "dayBranch");
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => !disabled && setActive(key)}
                disabled={disabled}
                className={[
                  "border rounded p-2 text-center cursor-pointer",
                  isActive ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30" : "border-neutral-300 dark:border-neutral-700",
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                ].join(" ")}
              >
                {label}<br/>
                <span className="font-bold">{pillars[key as keyof Pillars] ?? "-"}</span>
              </button>
            );
          })}
        </div>

        {monthBranchChoices && monthBranchChoices.length > 0 && (
          <div className="mb-3">
            <p className="text-sm mb-1">월지 후보를 선택하세요:</p>
            <div className="flex gap-2">
              {monthBranchChoices.map(br => (
                <button
                  key={br}
                  onClick={() => {
                    // ✅ 월지 확정
                    let next: Pillars = { ...pillars, monthBranch: br };
                    setMonthBranchChoices(null);

                    // ✅ 월두법 보정
                    next = applyWoldu(next, "monthBranch");
                    setPillars(next);

                    // ✅ 일간으로 포커스 이동
                    setActive("dayStem");
                  }}
                  className="flex-1 px-2 py-1 border rounded hover:bg-orange-100 dark:hover:bg-orange-800 cursor-pointer"
                >
                  {br}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 선택 패널 */}
        <div className="flex w-full flex-wrap gap-6 mb-4">
          {!active ? (
            <div className="text-sm text-neutral-500 p-2 border rounded w-full text-center">
              간지를 넣고 싶은 자리부터 클릭하세요.
            </div>
          ) : (
            <div className="w-full">
              {activeIsStem && ( 
                <div> 
                  <p className="font-medium mb-2">천간</p> 
                  <div className="grid grid-cols-5 gap-2"> 
                    {간지_MAP.천간.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSelect(s)}
                        className={`border rounded px-2 py-1 cursor-pointer ${getElementColor(s, "stem", settingsObj)}`}
                      >
                        {s}
                      </button>
                    ))} 
                  </div> 
                </div> 
              )}

              {activeIsBranch && (
                <div>
                  <p className="font-medium mb-2">지지</p>
                  <div className="grid grid-cols-6 gap-2">
                    {간지_MAP.지지.filter(b => {
                      const stemKey = counterpartKey(active!);
                      const st = pillars[stemKey] as Stem | undefined;
                      if (st) {
                        return BRANCH_YIN_YANG[b] === STEM_YIN_YANG[st];
                      }
                      return true;
                    }).map(b => (
                      <button
                        key={b}
                        onClick={() => handleSelect(b)}
                        className={`border rounded px-2 py-1 cursor-pointer ${getElementColor(b, "branch", settingsObj)}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          )}
        </div>

        {/* 액션 */}
        <div className="flex justify-between items-center gap-3 mb-4">
          <span>
            <button
            type="button"
            onClick={() => {
              if (!filledAll) {
                //setError("연·월·일·시 4간지를 모두 채워주세요.");
                setShowToast(true);
                return;
              }
              doSearch();
            }}
            disabled={searching}
            className="px-2 py-1 rounded-md bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
            
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="px-2 py-1 rounded-md bg-red-600 border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            >
              초기화
            </button>
            <button
            type="button"
            onClick={() => {
              const chosen =
                selectedRow !== null ? results?.filter((_, i) => i === selectedRow) ?? [] : [];
              if (chosen.length === 0) {
                //alert("선택된 항목이 없습니다. 검색버튼 먼저 눌러주세요.");
                setSearchToast(true);
                return;
              }
              handleSave();
            }}
            className="px-2 py-1 rounded-md border bg-yellow-600 border-neutral-300 dark:border-neutral-700 cursor-pointer"
          >
            저장하기
          </button>
          {/*error && <span className="text-sm text-red-600 dark:text-red-400"></span>*/}
          </span>
        </div>

        {/* 결과 */}
        <div className="max-h-[40vh] overflow-auto rounded border border-neutral-200 dark:border-neutral-800">
          {!results ? (
            <div className="p-2 text-neutral-500 text-sm text-center">조건을 입력하고 “검색”을 눌러주세요.</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-neutral-500">일치하는 날짜가 없습니다.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="p-1 text-center">선택</th>
                  <th className="p-1 text-center">날짜</th>
                  <th className="p-1 text-center">연</th>
                  <th className="p-1 text-center">월</th>
                  <th className="p-1 text-center">일</th>
                  <th className="p-1 text-center">시</th>
                  <th className="p-1 text-center">성별</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={`${r.date}-${idx}`} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-1 text-center">
                      <span className="chkContainer">
                        <input
                          type="radio"
                          name="selectRow"
                          id={`selectRow-${idx}`}
                          checked={selectedRow === idx}
                          onChange={() => setSelectedRow(idx)}
                        />
                        <label htmlFor={`selectRow-${idx}`}>ON</label>
                      </span>
                    </td>
                    <td className="p-1 text-center">{r.date}</td>
                    <td className="p-1 text-center">{r.year}</td>
                    <td className="p-1 text-center">{r.month}</td>
                    <td className="p-1 text-center">{r.day}</td>
                    <td className="p-1 text-center">
                      <div className="flex flex-wrap gap-1">
                        {r.hourSlots.map((s, i) => (
                          <span key={i} className="inline-flex items-center mx-auto gap-1 px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                            <b>{s.branch}</b>{/* <span className="text-xs text-neutral-500">{s.time}</span> */}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-1 text-center">{gender === "male" ? "남" : "여"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ✅ 토스트 */}
        {toast && (
          <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 top-6 z-[1100] border border-white/30">
            <div className="px-4 py-2 rounded-md bg-black/80 text-white text-sm shadow-lg">
              {toast}
            </div>
          </div>
        )}

        {showToast4 && (
          <div className="fixed inset-0 flex items-center justify-center z-[2000]">
            <div className="bg-black text-white px-4 py-2 rounded-lg shadow-lg">
              연·월·일·시 4간지를 모두 채워주세요.
            </div>
          </div>
        )}

        {searchToast && (
          <div className="fixed inset-0 flex items-center justify-center z-[2000]">
            <div className="bg-black text-white px-4 py-2 rounded-lg shadow-lg text-center">
              선택항목이 없습니다.<br />검색한 뒤, 체크박스로 선택하세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
