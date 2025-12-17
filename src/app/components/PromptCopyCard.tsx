
// features/prompt/PromptCopyCard.tsx
import { useMemo, useState, useEffect } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import {
  buildChatPrompt,
  buildMultiLuckPrompt,
} from "@/features/prompt/buildPrompt";
import {
  computeUnifiedPower,
  type LuckChain,
} from "@/features/AnalysisReport/utils/unifiedPower";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
} from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import {
  clamp01,
  getShinCategory,
  type ShinCategory,
} from "@/features/AnalysisReport/logic/shinStrength";
import { natalShinPercent } from "@/features/AnalysisReport/logic/powerPercent";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import DateInput from "@/features/luck/ui/DateTimePicker";
import { getDaewoonList } from "@/features/luck/daewoonList";
import {
  type MainCategoryKey,
  type SubCategoryKey,
  type RelationMode,
} from "@/features/prompt/buildPrompt";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { usePromptSectionsDB } from "@/features/AnalysisReport/hooks/usePromptSections";

// 🔥 사주 해석 톤 프리셋
type ToneKey =
  | "analysis"
  | "mentor"
  | "dryHumor"
  | "softWarm"
  | "ect";

const TONE_META: Record<ToneKey, { label: string; desc: string }> = {
  analysis: {
    label: "분석관찰형",
    desc: `- 감정 완전 배제하고, 사주를 데이터처럼 설명
- "이 명식은 구조적으로 이런 패턴이 반복됨" 같은 방식
- ST형 냉정 분석 느낌`,
  },
  mentor: {
    label: "조언가형",
    desc: `- 사주 구조 → 현실적 선택지 → 실행 조언
- 과한 긍정도 X, 과한 비관도 X
- “지금 이 흐름이면 ~~ 우선하자” 스타일`,
  },
  dryHumor: {
    label: "냉소유머형",
    desc: `- 약한 비꼼 + 드라이한 유머
- “이 조합이면 원래 순탄하긴 힘들지 ㅋㅋ 대신 재능치는 미쳤다” 같은 느낌`,
  },
  softWarm: {
    label: "심플따뜻형",
    desc: `- 불필요한 말 없이 부드럽게 핵심 전달
- 공감형보다 담백하고 깔끔한 톤`,
  },
  ect: {
    label: "톤 지정 X",
    desc: `- 톤 지정 따로 없음`,
  },
};

type Props = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
};

const TABS: BlendTab[] = ["원국", "대운", "세운", "월운", "일운"];

const STEM_H2K: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const MAIN_CATEGORY_META: Record<MainCategoryKey, { label: string }> = {
  personality: { label: "타고난 성향 · 성격 · 기질" },
  lifeFlow: { label: "인생 전체 흐름 · 시기운" },
  love: { label: "사랑 · 연애 · 결혼" },
  career: { label: "직업 · 진로 · 학업 · 시험" },
  money: { label: "돈 · 재물 · 사업 · 투자" },
  family: { label: "가족 · 부모 · 형제자매 · 자녀" },
  baby: { label: "임신 · 출산 · 택일" },
  health: { label: "건강 · 체질 · 사고 · 멘탈" },
  move: { label: "이사 · 이직 · 이동 · 환경 변화" },
  social: { label: "인간관계 · 사회생활 · 대인 스트레스" },
  compat: { label: "궁합 · 상대별 분석" },
  risk: { label: "특수 상황 · 리스크 이슈" },
  meta: { label: "사주 활용 · 메타 질문" },
  etc: { label: "기타 · 자유질문" },
};

type SubMeta = { key: SubCategoryKey; label: string };

const CATEGORY_SUBS: Record<MainCategoryKey, SubMeta[]> = {
  personality: [
    { key: "overview", label: "전체 성향 보기" },
    { key: "personality_basic", label: "기본 성격 틀" },
    { key: "personality_shadow", label: "숨은 단점·그림자" },
    { key: "personality_relationshipStyle", label: "관계 속 성향" },
    { key: "personality_workStyle", label: "일할 때 스타일" },
    { key: "personality_stressPattern", label: "스트레스 패턴" },
  ],
  lifeFlow: [
    { key: "overview", label: "인생 흐름 전체" },
    { key: "lifeFlow_cycle", label: "인생 사이클·패턴" },
    { key: "lifeFlow_turningPoint", label: "전환점·갈림길" },
    { key: "lifeFlow_peak", label: "호황기·전성기" },
    { key: "lifeFlow_down", label: "저점·조심시기" },
    { key: "lifeFlow_theme", label: "인생 주요 테마" },
  ],
  love: [
    { key: "love_pattern", label: "연애운 패턴" },
    { key: "love_timing", label: "언제 연애/결혼할지" },
    { key: "love_partner", label: "배우자상·배우자 집안" },
    { key: "love_current", label: "현재 연애/혼인 관계" },
    { key: "love_breakup", label: "이별/재회 이슈" },
    { key: "love_marriageChange", label: "이혼·재혼 흐름" },
  ],
  career: [
    { key: "career_aptitude", label: "적성·직업군 추천" },
    { key: "career_mode", label: "직장인 vs 프리/사업" },
    { key: "career_jobChange", label: "이직/퇴사 타이밍" },
    { key: "career_promotion", label: "승진·입지·평판" },
    { key: "career_study", label: "학업·전공·유학" },
    { key: "career_exam", label: "시험운·자격증" },
  ],
  money: [
    { key: "overview", label: "돈·재물 흐름 전체" },
    { key: "money_flow", label: "전반적인 돈 흐름" },
    { key: "money_income", label: "수입·연봉·부수입" },
    { key: "money_spending", label: "소비·지출 패턴" },
    { key: "money_saving", label: "저축·목돈 마련" },
    { key: "money_asset", label: "자산·재산 구조" },
    { key: "money_debt", label: "빚·대출 이슈" },
    { key: "money_invest", label: "투자 성향·타이밍" },
    { key: "money_bigEvent", label: "이사·결혼 등 큰돈" },
  ],
  family: [
    { key: "overview", label: "가족·자녀 이슈 전체" },
    { key: "family_origin", label: "원가족(부모·형제)" },
    { key: "family_current", label: "현재 가정·배우자" },
    { key: "family_parents", label: "부모와의 관계" },
    { key: "family_siblings", label: "형제자매와의 관계" },
    { key: "family_children", label: "자녀운·양육" },
    { key: "family_care", label: "돌봄·부양 이슈" },
  ],
  baby: [
    { key: "overview", label: "임신·출산·택일 전체" },
    { key: "baby_pregnancy", label: "임신 관련 이슈" },
    { key: "baby_birth", label: "출산 관련 이슈" },
    { key: "baby_selection", label: "택일 관련 이슈" },
  ],
  health: [
    { key: "overview", label: "건강·사고·멘탈 전체" },
    { key: "health_overall", label: "전반적인 체질·컨디션" },
    { key: "health_physical", label: "몸 건강·피로도" },
    { key: "health_mental", label: "마음·멘탈 컨디션" },
    { key: "health_stress", label: "스트레스 반응" },
    { key: "health_accident", label: "사고·부상 리스크" },
  ],
  move: [
    { key: "overview", label: "이사·환경 변화 전체" },
    { key: "move_timing", label: "이사 타이밍" },
    { key: "move_chance", label: "이사 성사 가능성" },
    { key: "move_targetHouse", label: "마음에 둔 집과 궁합" },
    { key: "move_environment", label: "동네·생활권 분위기" },
    { key: "move_finance", label: "주거비·대출 구조" },
  ],
  social: [
    { key: "overview", label: "인간관계·사회 전체" },
    { key: "social_overall", label: "관계 전반 패턴" },
    { key: "social_friend", label: "친구 관계 스타일" },
    { key: "social_workspace", label: "직장 내 인간관계" },
    { key: "social_network", label: "인맥·네트워크" },
    { key: "social_conflict", label: "갈등·대립 패턴" },
  ],
  compat: [
    { key: "overview", label: "궁합·상대 분석 전체" },
    { key: "compat_overall", label: "전반 궁합 분위기" },
    { key: "compat_love", label: "연애·결혼 궁합" },
    { key: "compat_marriage", label: "혼인 생활 상성" },
    { key: "compat_work", label: "일·동업 궁합" },
    { key: "compat_family", label: "가족 간 궁합" },
    { key: "compat_friend", label: "친구·지인 궁합" },
  ],
  risk: [
    { key: "overview", label: "리스크·위기 전체" },
    { key: "risk_money", label: "돈·투자 리스크" },
    { key: "risk_relationship", label: "관계·집착 이슈" },
    { key: "risk_health", label: "건강·번아웃 리스크" },
    { key: "risk_lawsuit", label: "법적·계약 리스크" },
    { key: "risk_burnout", label: "번아웃·멘탈 붕괴" },
  ],
  meta: [
    { key: "overview", label: "사주 활용·메타 전체" },
    { key: "meta_structure", label: "전체 구조 요약" },
    { key: "meta_cycle", label: "대운·세운 큰 흐름" },
    { key: "meta_trigger", label: "이벤트 트리거 해석" },
    { key: "meta_usage", label: "삶에 적용하는 방법" },
  ],
  etc: [],
};

function normalizeGZLocal(raw: string): string {
  if (!raw) return "";
  if (raw.length === 2) return raw;

  const s = raw
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(
    /([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/,
  );
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(
    /([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/,
  );
  if (mHa) {
    const st = STEM_H2K[mHa[1] as keyof typeof STEM_H2K];
    const br = BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K];
    return st && br ? `${st}${br}` : "";
  }
  return "";
}

function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");

  return arr.map((raw, idx) => {
    if (!raw) return "";
    const s = raw
      .replace(/[()[\]{}]/g, "")
      .replace(/\s+/g, "")
      .replace(/[년월일시年月日時干支柱:\-_.]/g, "");

    const mKo = s.match(
      /([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/,
    );
    if (mKo) return `${mKo[1]}${mKo[2]}`;

    const mHa = s.match(
      /([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/,
    );
    if (mHa) {
      return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${
        BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]
      }`;
    }
    return idx <= 2 ? "--" : "";
  });
}

/**
 * "명식 정보만" 복사용: 프롬프트 중에서 카테고리(해석 요청) 섹션 이전까지만 잘라냄.
 * (buildChatPrompt / buildMultiLuckPrompt 쪽에서 "## 카테고리"를 쓰는 구조를 전제로 함)
 */
function extractMyeongSikInfoOnly(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";

  // 가장 먼저 등장하는 "해석 지시문" 시작점을 찾아서 그 전까지만 남김
  const markers: RegExp[] = [
    /\r?\n-----\s*\r?\n/,              // ✅ 네가 올린 블록 시작점
    /\r?\n🧭\s*해석\s*가이드/,          // 혹시 ----- 없이 바로 시작하는 경우 대비
    /\r?\n🎯\s*질문\s*포커스/,
    /\r?\n##\s*시간\s*모드/,
    /\r?\n##\s*카테고리/,
  ];

  let cut = -1;
  for (const re of markers) {
    const idx = text.search(re);
    if (idx >= 0) cut = cut < 0 ? idx : Math.min(cut, idx);
  }

  return cut >= 0 ? text.slice(0, cut).trimEnd() : text;
}

export default function PromptCopyCard({
  ms,
  natal,
  chain,
  basis,
  lunarPillars,
  includeTenGod = false,
}: Props) {

  const msId = ms?.id ?? null; // 네가 실제 쓰는 “명식 id”로 연결
  const { sections, toggleSection, isSaving } = usePromptSectionsDB(msId);

  const [tone, setTone] = useState<ToneKey>("analysis");
  const [friendMode, setFriendMode] = useState(false);
  const [teacherMode, setTeacherMode] = useState(false);

  const { date, setDate } = useLuckPickerStore();

  // 명식이 바뀌면 기준 일자를 오늘로 초기화 (LuckGlobalPicker와 동일하게 반응)
  useEffect(() => {
    setDate(new Date());
  }, [ms.id, setDate]);

  const { list, currentId } = useMyeongSikStore.getState();

  const [partnerId, setPartnerId] = useState<string>("");

  const [mainCategory, setMainCategory] =
    useState<MainCategoryKey>("personality");
  const [subCategory, setSubCategory] = useState<SubCategoryKey>("overview");

  const partnerMs = useMemo<MyeongSik | null>(() => {
    if (!partnerId) return null;
    return list.find((m) => m.id === partnerId) ?? null;
  }, [partnerId, list]);

  const [activeTab, setActiveTab] = useState<BlendTab>("원국");
  const [relationMode, setRelationMode] = useState<RelationMode>("solo");

  useEffect(() => {
    if (mainCategory !== "love" && mainCategory !== "compat") {
      setRelationMode("solo");
      setPartnerId("");
    }
  }, [mainCategory]);

  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiTab, setMultiTab] = useState<"대운" | "세운" | "월운" | "일운">(
    "대운",
  );

  const [selectedDaeIdx, setSelectedDaeIdx] = useState<number[]>([]);

  useEffect(() => {
    // 대운 탭에서 고른 항목은, 다른 탭(세/월/일)로 넘어가면 자동 취소
    if (multiTab !== "대운") {
      setSelectedDaeIdx([]);
    }
  }, [multiTab]);

  const [seStartYear, setSeStartYear] = useState<number>(new Date().getFullYear());
  const [seEndYear, setSeEndYear] = useState<number>(new Date().getFullYear());
  const [wolStartYM, setWolStartYM] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [wolEndYM, setWolEndYM] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [ilStartDate, setIlStartDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [ilEndDate, setIlEndDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  function diffMonths(a: Date, b: Date) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  function formatYM(dateObj: Date) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  }

  function formatYMD(dateObj: Date) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(dateObj.getDate()).padStart(2, "0")}`;
  }

  const handleSeStartChange = (year: number) => {
    setSeStartYear(year);
  };

  const handleSeEndChange = (year: number) => {
    setSeEndYear(year);
  };

  const fixStartYear = () => {
    const s = seStartYear;
    let e = seEndYear;

    if (e < s) e = s;
    if (e - s > 9) e = s + 9;

    setSeEndYear(e);
  };

  const fixEndYear = () => {
    let s = seStartYear;
    const e = seEndYear;

    if (e < s) s = e;
    if (e - s > 9) s = e - 9;

    setSeStartYear(s);
  };

  const handleWolStartChange = (ym: string) => {
    setWolStartYM(ym);
  };

  const handleWolStartBlur = () => {
    const [sY, sM] = wolStartYM.split("-").map(Number);
    const [eY, eM] = wolEndYM.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    if (end < start) {
      setWolEndYM(formatYM(start));
      return;
    }

    const diff = diffMonths(start, end);
    if (diff > 11) {
      const newEnd = new Date(start);
      newEnd.setMonth(start.getMonth() + 11);
      setWolEndYM(formatYM(newEnd));
    }
  };

  const handleWolEndChange = (ym: string) => {
    setWolEndYM(ym);
  };

  const handleWolEndBlur = () => {
    const [sY, sM] = wolStartYM.split("-").map(Number);
    const [eY, eM] = wolEndYM.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    if (end < start) {
      setWolStartYM(formatYM(end));
      return;
    }

    const diff = diffMonths(start, end);
    if (diff > 11) {
      const newStart = new Date(end);
      newStart.setMonth(end.getMonth() - 11);
      setWolStartYM(formatYM(newStart));
    }
  };

  const handleIlStartChange = (dateStr: string) => {
    setIlStartDate(dateStr);
  };

  const handleIlStartBlur = () => {
    if (!ilStartDate || !ilEndDate) return;

    const [sY, sM, sD] = ilStartDate.split("-").map(Number);
    const [eY, eM, eD] = ilEndDate.split("-").map(Number);

    const start = new Date(sY, sM - 1, sD, 4, 0, 0);
    const end = new Date(eY, eM - 1, eD, 4, 0, 0);

    if (end < start) {
      setIlEndDate(formatYMD(start));
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    if (diffDays > 7) {
      const newEnd = new Date(start);
      newEnd.setDate(start.getDate() + 6);
      setIlEndDate(formatYMD(newEnd));
    }
  };

  const handleIlEndChange = (dateStr: string) => {
    setIlEndDate(dateStr);
  };

  const handleIlEndBlur = () => {
    if (!ilStartDate || !ilEndDate) return;

    const [sY, sM, sD] = ilStartDate.split("-").map(Number);
    const [eY, eM, eD] = ilEndDate.split("-").map(Number);

    const start = new Date(sY, sM - 1, sD, 4, 0, 0);
    const end = new Date(eY, eM - 1, eD, 4, 0, 0);

    if (start > end) {
      setIlStartDate(formatYMD(end));
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    if (diffDays > 7) {
      const newStart = new Date(end);
      newStart.setDate(end.getDate() - 6);
      setIlStartDate(formatYMD(newStart));
    }
  };

  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const fallbackChain = useMemo<LuckChain>(() => {
    if (chain) {
      return {
        dae: chain.dae ?? null,
        se: chain.se ?? null,
        wol: chain.wol ?? null,
        il: chain.il ?? null,
      };
    }

    const base = date ?? new Date();
    const se = normalizeGZLocal(getYearGanZhi(base) || "");
    const wol = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");

    return {
      dae: null,
      se: se || null,
      wol: wol || null,
      il: il || null,
    };
  }, [chain, date, rule]);

  const manualHour = useHourPredictionStore.getState().manualHour;

  const solarKo = useMemo(() => normalizePillars(natal), [natal]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

  const solarKoWithHour = useMemo(() => {
    const arr = [...solarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [solarKo, manualHour]);

  const lunarKoWithHour = useMemo(() => {
    const arr = [...lunarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [lunarKo, manualHour]);

  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(ms.birthDay?.slice(0, 4));
    const m = Number(ms.birthDay?.slice(4, 6));
    const d = Number(ms.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 4, 0, 0);
    const yn = normalizeGZLocal(getYearGanZhi(base) || "");
    const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
    const si = "";
    return [yn, wl, il, si];
  }, [ms.birthDay, rule]);

  const solarValid = hasValidYmd(solarKoWithHour);
  const lunarValid = hasValidYmd(lunarKoWithHour);

  const [basisMonth] = useState<"solar" | "lunar">("solar");
  const effectiveBasis: "solar" | "lunar" =
    basisMonth === "lunar"
      ? lunarValid
        ? "lunar"
        : solarValid
          ? "solar"
          : "lunar"
      : solarValid
        ? "solar"
        : lunarValid
          ? "lunar"
          : "solar";

  const activePillars = useMemo<[string, string, string, string]>(() => {
    const source =
      effectiveBasis === "lunar"
        ? lunarValid
          ? lunarKoWithHour
          : solarValid
            ? solarKoWithHour
            : computedFallback ?? ["", "", "", ""]
        : solarValid
          ? solarKoWithHour
          : lunarValid
            ? lunarKoWithHour
            : computedFallback ?? ["", "", "", ""];
    const arr = [...source] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [
    effectiveBasis,
    solarValid,
    lunarValid,
    solarKoWithHour,
    lunarKoWithHour,
    computedFallback,
    manualHour,
  ]);

  const hourKey = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars],
  );

  if (!natal || natal.length === 0) {
    natal = buildNatalPillarsFromMs(ms);
  }

  const manualHourStr = manualHour ? manualHour.stem + manualHour.branch : "";

  const natalWithPrediction = useMemo(() => {
    const pillars = buildNatalPillarsFromMs(ms);
    if (manualHourStr && manualHourStr.length === 2) {
      pillars[3] = manualHourStr;
    }
    return pillars;
  }, [ms, manualHourStr]);

  const unified = useMemo(() => {
    return computeUnifiedPower({
      natal: natalWithPrediction,
      tab: activeTab,
      chain: fallbackChain,
      hourKey,
    });
  }, [natalWithPrediction, activeTab, fallbackChain, hourKey]);

  function getDayElementPercent(natalArr: string[]): number {
    const shinPct = natalShinPercent(natalArr, {
      criteriaMode: "modern",
      useHarmonyOverlay: true,
    });
    return shinPct;
  }

  const value = getDayElementPercent(natalWithPrediction);
  const percent = useMemo(() => clamp01(value), [value]);
  const category: ShinCategory = useMemo(() => getShinCategory(percent), [percent]);

  const daeList = useMemo(() => {
    const rawList = getDaewoonList(ms).slice(0, 10);
    const birthYear = ms.birthDay ? Number(ms.birthDay.slice(0, 4)) : 0;

    return rawList.map((str, idx) => {
      const match = str.match(/(\d{4})년\s+(\d{1,2})월\s+([가-힣]{2})\s+대운/);
      const startYear = match ? Number(match[1]) : 0;
      const startMonth = match ? Number(match[2]) : 1;
      const startDay = 1;
      const gz = match ? match[3] : "";
      const age = birthYear > 0 ? koreanAgeByYear(birthYear, startYear) : idx * 10;

      return {
        gz,
        age,
        startYear,
        startMonth,
        startDay,
        endYear: startYear + 10,
      };
    });
  }, [ms]);

  const currentSubList: SubMeta[] = CATEGORY_SUBS[mainCategory];

  const normalText = useMemo(() => {
    if (!ms) return "";
    return buildChatPrompt({
      ms,
      natal: natalWithPrediction,
      chain: fallbackChain,
      basis,
      includeTenGod,
      tab: activeTab,
      unified,
      percent,
      category,
      topic: mainCategory,
      subTopic: subCategory,
      timeMode: "single",
      relationMode,
      partnerMs:
        (mainCategory === "love" || mainCategory === "compat") && relationMode === "couple"
          ? partnerMs ?? null
          : null,
      teacherMode,
      sections
    });
  }, [
    ms,
    basis,
    includeTenGod,
    activeTab,
    fallbackChain,
    unified,
    percent,
    category,
    natalWithPrediction,
    mainCategory,
    subCategory,
    relationMode,
    partnerMs,
    teacherMode,
    sections
  ]);

  const multiText = useMemo(() => {
    if (!ms || !isMultiMode) return "";

    const selectedDaeList = selectedDaeIdx.map((idx) => daeList[idx]).filter((v) => v);

    const seYears =
      multiTab === "세운"
        ? (() => {
            const years: number[] = [];
            for (let y = seStartYear; y <= seEndYear && years.length < 10; y++) {
              years.push(y);
            }
            return years;
          })()
        : [];

    const wolMonths =
      multiTab === "월운"
        ? (() => {
            const months: string[] = [];
            const [startY, startM] = wolStartYM.split("-").map(Number);
            const [endY, endM] = wolEndYM.split("-").map(Number);
            const curDate = new Date(startY, startM - 1);
            const endDate = new Date(endY, endM - 1);

            while (curDate <= endDate && months.length < 12) {
              months.push(
                `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}`,
              );
              curDate.setMonth(curDate.getMonth() + 1);
            }
            return months;
          })()
        : [];

    const ilDays: string[] =
      multiTab === "일운"
        ? (() => {
            const days: string[] = [];
            const [sY, sM, sD] = ilStartDate.split("-").map(Number);
            const [eY, eM, eD] = ilEndDate.split("-").map(Number);

            const start = new Date(sY, sM - 1, sD, 4, 0, 0);
            const end = new Date(eY, eM - 1, eD, 4, 0, 0);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) return days;

            const cur = new Date(start);
            while (cur <= end && days.length < 31) {
              const yyyy = cur.getFullYear();
              const mm = String(cur.getMonth() + 1).padStart(2, "0");
              const dd = String(cur.getDate()).padStart(2, "0");
              days.push(`${yyyy}-${mm}-${dd}`);
              cur.setDate(cur.getDate() + 1);
            }
            return days;
          })()
        : [];

    return buildMultiLuckPrompt({
      ms,
      natal: natalWithPrediction,
      basis,
      includeTenGod,
      unified,
      percent,
      category,
      selectedDaeList,
      daeList,
      seYears,
      wolMonths,
      ilDays,
      topic: mainCategory,
      subTopic: subCategory,
      timeMode: "multi",
      relationMode: mainCategory === "love" || mainCategory === "compat" ? relationMode : undefined,
      partnerMs:
        (mainCategory === "love" || mainCategory === "compat") && relationMode === "couple"
          ? partnerMs ?? null
          : null,
      teacherMode,
      sections
    });
  }, [
    ms,
    isMultiMode,
    multiTab,
    selectedDaeIdx,
    daeList,
    seStartYear,
    seEndYear,
    wolStartYM,
    wolEndYM,
    ilStartDate,
    ilEndDate,
    natalWithPrediction,
    basis,
    includeTenGod,
    unified,
    percent,
    category,
    mainCategory,
    subCategory,
    relationMode,
    partnerMs,
    teacherMode,
    sections
  ]);

  const partnerPromptFragment = useMemo(() => {
    if (relationMode !== "couple" || !partnerMs) return "";

    const name = partnerMs.name || "미입력";

    let birthDate = "미입력";
    if (partnerMs.birthDay && partnerMs.birthDay.length === 8) {
      const y = partnerMs.birthDay.slice(0, 4);
      const m = partnerMs.birthDay.slice(4, 6);
      const d = partnerMs.birthDay.slice(6, 8);
      birthDate = `${y}-${m}-${d}`;
    } else if (partnerMs.birthDay) {
      birthDate = partnerMs.birthDay;
    }

    let birthTime = "미입력";
    if (partnerMs.birthTime && partnerMs.birthTime.trim().length > 0) {
      const raw = partnerMs.birthTime.trim();
      const padded = raw.padEnd(4, "0").slice(0, 4);
      const hh = padded.slice(0, 2);
      const mm = padded.slice(2, 4);
      birthTime = `${hh}:${mm}`;
    }

    let birthPlaceName = "미입력";
    if (partnerMs.birthPlace && typeof partnerMs.birthPlace === "object") {
      birthPlaceName = partnerMs.birthPlace.name || "미입력";
    }

    const ganjiText = partnerMs.ganji || partnerMs.ganjiText || "미입력";

    return [
      "",
      "",
      "[추가 정보 - 상대방(파트너) 명식]",
      "상대방 정보",
      `- 이름 : ${name}`,
      `- 생일 : ${birthDate}`,
      `- 태어난 시간 : ${birthTime}`,
      `- 태어난 지역 : ${birthPlaceName}`,
      `- ${ganjiText}`,
      "",
      "※ 사랑/연애/결혼, 궁합 관련 해석에서는 위 상대 정보를 반영해서,",
      "   실제 커플의 관계 흐름과 현실적인 상황을 중심으로 설명해 주세요.",
      "",
    ].join("\n");
  }, [relationMode, partnerMs]);

  const baseText = isMultiMode ? multiText : normalText;

  // 🔥 톤 적용 프롬프트 텍스트
  const toneInstruction = useMemo(() => {
    switch (tone) {
      case "analysis":
        return "※ 해석은 감정 배제하고 과학적·분석적으로 설명한다.\n";
      case "mentor":
        return "※ 현실 조언 중심으로 균형 있게 설명한다.\n";
      case "dryHumor":
        return "※ 드라이한 유머 톤으로, 가벼운 냉소 섞어서 설명한다.\n";
      case "softWarm":
        return "※ 담백하지만 따뜻한 톤으로 설명한다.\n";
      default:
        return "";
    }
  }, [tone]);

  const friendInstruction = friendMode ? "※ 모든 해석은 반말로, 친구처럼 편하게 말한다.\n" : "";

  const basePrompt = useMemo(
    () =>
      baseText || partnerPromptFragment
        ? `${baseText}${partnerPromptFragment}\n${toneInstruction}${friendInstruction}`
        : "",
    [toneInstruction, friendInstruction, baseText, partnerPromptFragment],
  );

  const [questionDraft, setQuestionDraft] = useState("");
  const [extraQuestions, setExtraQuestions] = useState<string[]>([]);

  // ✅ 명식이 바뀌면 추가 질문/입력 드래프트 초기화
  useEffect(() => {
    setQuestionDraft("");
    setExtraQuestions([]);
  }, [ms.id]);

  const finalText = useMemo(() => {
    if (!basePrompt) return "";
    if (extraQuestions.length === 0) return basePrompt;

    const lines: string[] = [
      "",
      "-----",
      "📝 사용자가 추가로 궁금한 질문 목록",
      "",
      ...extraQuestions.map((q, idx) => `${idx + 1}. ${q}`),
    ];

    return `${basePrompt}\n${lines.join("\n")}`;
  }, [basePrompt, extraQuestions]);

  // ✅ "명식정보만" 복사용 텍스트 (톤/반말/추가질문 제외)
  const infoOnlyText = useMemo(() => {
    const infoPart = extractMyeongSikInfoOnly(baseText);
    const merged = `${infoPart}${partnerPromptFragment}`.trim();
    return merged;
  }, [baseText, partnerPromptFragment]);

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);

  const canCopyAll = Boolean(finalText && finalText.trim().length > 0);
  const canCopyInfo = Boolean(infoOnlyText && infoOnlyText.trim().length > 0);

  async function onCopyAll() {
    if (!canCopyAll) return;
    try {
      await navigator.clipboard.writeText(finalText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1200);
    } catch {
      setCopiedAll(false);
    }
  }

  async function onCopyInfoOnly() {
    if (!canCopyInfo) return;
    try {
      await navigator.clipboard.writeText(infoOnlyText);
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 1200);
    } catch {
      setCopiedInfo(false);
    }
  }

  if (!ms) {
    return (
      <div className="p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-500">
        ⚠️ 명식을 먼저 선택해주세요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-3">
      {/* 헤더 + 복사 버튼(2개) */}
      <div className="flex flex-col desk:flex-row desk:items-center desk:justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          GPT 프롬프트 제공용
        </div>

        {/* 모바일: 세로 / PC: 가로 */}
        <div className="flex gap-2 w-full desk:w-auto">
          <button
            type="button"
            onClick={onCopyInfoOnly}
            disabled={!canCopyInfo}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap border",
              canCopyInfo ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              copiedInfo
                ? "bg-green-600 text-white border-green-600"
                : "bg-orange-600 text-white dark:bg-orange-600 cursor-pointer",
            ].join(" ")}
          >
            {copiedInfo ? "복사됨!" : "명식정보만 복사"}
          </button>

          <button
            type="button"
            onClick={onCopyAll}
            disabled={!canCopyAll}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap",
              canCopyAll ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              copiedAll
                ? "bg-green-600 text-white"
                : "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black",
            ].join(" ")}
          >
            {copiedAll ? "복사됨!" : "전체 프롬프트 복사"}
          </button>
        </div>
      </div>

      <div className="mt-3 border-t pt-2">
        <div className="text-[11px] font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
          프롬프트 포함 데이터
        </div>

        <div className="grid grid-cols-5 desk:grid-cols-8 gap-2 text-[11px] text-neutral-700 dark:text-neutral-200">

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sections.twelveUnseong}
              onChange={() => toggleSection("twelveUnseong")}
              className="w-3 h-3"
            />
            십이운성
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sections.twelveShinsal}
              onChange={() => toggleSection("twelveShinsal")}
              className="w-3 h-3"
            />
            십이신살
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sections.shinsal}
              onChange={() => toggleSection("shinsal")}
              className="w-3 h-3"
            />
            기타 신살
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sections.nabeum}
              onChange={() => toggleSection("nabeum")}
              className="w-3 h-3"
            />
            납음오행
          </label>
          {isSaving ? <span className="text-[11px] text-neutral-400">저장중…</span> : null}
        </div>
      </div>

      {/* 카테고리 셀렉트 영역 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 🔥 사주 톤 선택 */}
        <div className="w-full mt-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-800">
          <div className="text-xs font-semibold mb-1 text-neutral-700 dark:text-neutral-200">
            해석 모드 선택
          </div>

          {/* 버튼 목록 */}
          <div className="flex gap-1.5 mb-2">
            {(Object.keys(TONE_META) as ToneKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setTone(key)}
                className={`flex-1 p-1 text-[10px] rounded border cursor-pointer ${
                  tone === key
                    ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                    : "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                }`}
              >
                {TONE_META[key].label}
              </button>
            ))}
          </div>

          {/* 설명문 */}
          <div className="text-[11px] whitespace-pre-line text-neutral-600 dark:text-neutral-300 leading-4">
            {TONE_META[tone].desc}
          </div>

          {/* 🔥 친구(반말) 옵션 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="mr-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="friendMode"
                checked={friendMode}
                onChange={(e) => setFriendMode(e.target.checked)}
                className="w-3 h-3"
              />
              <label
                htmlFor="friendMode"
                className="text-[11px] text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                반말모드
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="teacherMode"
                checked={teacherMode}
                onChange={(e) => setTeacherMode(e.target.checked)}
                className="w-3 h-3"
              />
              <label
                htmlFor="teacherMode"
                className="text-[11px] text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                선생님모드(공부/학습용)
              </label>
            </div>
          </div>
        </div>

        <select
          value={mainCategory}
          onChange={(e) => {
            const key = e.target.value as MainCategoryKey;
            setMainCategory(key);

            const subs = CATEGORY_SUBS[key];
            if (subs.length > 0) {
              setSubCategory(subs[0].key);
            } else {
              setSubCategory("overview");
            }

            if (key !== "love" && key !== "compat") {
              setRelationMode("solo");
            }
          }}
          className="px-2.5 h-30 h-8 text-[11px] rounded-md border bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700"
        >
          {(Object.keys(MAIN_CATEGORY_META) as MainCategoryKey[]).map((key) => {
            const meta = MAIN_CATEGORY_META[key];
            return (
              <option key={key} value={key}>
                {meta.label}
              </option>
            );
          })}
        </select>

        {currentSubList.length > 0 && (
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value as SubCategoryKey)}
            className="px-2.5 h-30 h-8 text-[11px] rounded-md border bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700"
          >
            {currentSubList.map((sub) => (
              <option key={sub.key} value={sub.key}>
                {sub.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {(mainCategory === "love" || mainCategory === "compat") && (
        <div className="flex flex-col gap-1.5 text-[11px] text-neutral-700 dark:text-neutral-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">연애 기준</span>
            <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setRelationMode("solo")}
                className={`px-3 py-1 cursor-pointer ${
                  relationMode === "solo"
                    ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                    : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                솔로 기준
              </button>
              <button
                type="button"
                onClick={() => setRelationMode("couple")}
                className={`px-3 py-1 cursor-pointer ${
                  relationMode === "couple"
                    ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                    : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                커플 기준
              </button>
            </div>
          </div>

          {relationMode === "couple" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">상대 명식 선택</span>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="min-w-[180px] h-30 px-2 py-1 border rounded bg-white dark:bg-neutral-800"
              >
                <option value="">선택 안 함</option>
                {list
                  .filter((m) => m.id !== currentId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || "이름 없음"} {m.birthDay ? `(${m.birthDay})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setIsMultiMode(false)}
          className={`px-3 py-1.5 text-xs rounded-md border cursor-pointer ${
            !isMultiMode
              ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          일반 모드
        </button>
        <button
          onClick={() => setIsMultiMode(true)}
          className={`px-3 py-1.5 text-xs rounded-md border cursor-pointer ${
            isMultiMode
              ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          멀티모드(일정기간입력)
        </button>
      </div>

      {!isMultiMode && (
        <>
          <div className="flex desk:justify-between flex-col desk:flex-row gap-2">
            <div className="flex gap-1 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-2 py-1 text-xs rounded-md border cursor-pointer ${
                    activeTab === t
                      ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <DateInput date={date} onChange={setDate} />
          </div>

          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            <p>위에 피커로 날짜를 조정할 수 있습니다.</p>
            <p>각 탭에 따라서, 기준이 달라집니다.</p>
            <p>프롬프트를 복사하여 마음껏 커스텀하여, 사용할 수 있습니다.</p>
          </div>
        </>
      )}

      {isMultiMode && (
        <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex gap-1.5 border-b pb-2">
            {(["대운", "세운", "월운", "일운"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMultiTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                  multiTab === tab
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {multiTab === "대운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                대운 선택 (다중 선택 가능)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {daeList.map((dae, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDaeIdx((prev) =>
                        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
                      );
                    }}
                    className={`px-2 py-1.5 text-xs rounded border cursor-pointer text-left ${
                      selectedDaeIdx.includes(idx)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    <div className="font-mono">{dae.gz}</div>
                    <div className="text-[10px] opacity-80">
                      {dae.age}세 ({dae.startYear}~{dae.endYear})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {multiTab === "세운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                세운 범위 (최대 10년)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seStartYear}
                  onChange={(e) => handleSeStartChange(Number(e.target.value))}
                  onBlur={fixStartYear}
                  className="w-24 h-30 px-2 text-[16px] desk:text-xs border rounded bg-white dark:bg-neutral-700"
                  placeholder="시작년도"
                />
                <span className="text-xs">~</span>
                <input
                  type="number"
                  value={seEndYear}
                  onChange={(e) => handleSeEndChange(Number(e.target.value))}
                  onBlur={fixEndYear}
                  className="w-24 h-30 px-2 text-[16px] desk:text-xs border rounded bg-white dark:bg-neutral-700"
                  placeholder="종료년도"
                />
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                선택 범위: {seEndYear - seStartYear + 1}년
              </div>
            </div>
          )}

          {multiTab === "월운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                월운 범위 (최대 12개월)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={wolStartYM}
                  onChange={(e) => handleWolStartChange(e.target.value)}
                  onBlur={handleWolStartBlur}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
                <span className="text-xs">~</span>
                <input
                  type="month"
                  value={wolEndYM}
                  onChange={(e) => handleWolEndChange(e.target.value)}
                  onBlur={handleWolEndBlur}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                선택 범위:{" "}
                {(() => {
                  const [startY, startM] = wolStartYM.split("-").map(Number);
                  const [endY, endM] = wolEndYM.split("-").map(Number);
                  const months = (endY - startY) * 12 + (endM - startM) + 1;
                  return months;
                })()}
                개월
              </div>
            </div>
          )}

          {multiTab === "일운" && (
            <div>
              <div className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
                일운 범위 (최대 7일)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={ilStartDate}
                  onChange={(e) => handleIlStartChange(e.target.value)}
                  onBlur={handleIlStartBlur}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
                <span className="text-xs">~</span>
                <input
                  type="date"
                  value={ilEndDate}
                  onChange={(e) => handleIlEndChange(e.target.value)}
                  onBlur={handleIlEndBlur}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700"
                />
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                선택 범위:{" "}
                {(() => {
                  const [sY, sM, sD] = ilStartDate.split("-").map(Number);
                  const [eY, eM, eD] = ilEndDate.split("-").map(Number);

                  const start = new Date(sY, sM - 1, sD, 4, 0, 0);
                  const end = new Date(eY, eM - 1, eD, 4, 0, 0);

                  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

                  const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
                  return diffDays;
                })()}
                일
              </div>
            </div>
          )}

          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            <p>선택한 {multiTab}의 데이터가 프롬프트에 포함됩니다.</p>
            <p>각 운마다 별도 섹션으로 출력됩니다.</p>
          </div>
        </div>
      )}

      {/* 추가 질문 입력 영역 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            추가 질문 입력 (선택)
          </div>
          {extraQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => setExtraQuestions([])}
              className="px-2 py-1 text-[10px] rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-300 cursor-pointer"
            >
              전체 삭제
            </button>
          )}
        </div>

        <textarea
          value={questionDraft}
          onChange={(e) => setQuestionDraft(e.target.value)}
          placeholder="여기에 GPT에게 추가로 물어보고 싶은 내용을 적고, '질문 추가' 버튼을 눌러주세요."
          rows={3}
          className="w-full placeholder:text-xs text-[16px] desk:text-xs rounded-md border bg-white dark:bg-neutral-800 p-2"
        />
        <div className="mb-4 text-center">
          <button
            type="button"
            onClick={() => {
              const trimmed = questionDraft.trim();
              if (!trimmed) return;
              setExtraQuestions((prev) => [...prev, trimmed]);
              setQuestionDraft("");
            }}
            className="w-full desk:max-w-[160px] px-1 py-1.5 text-xs rounded-md border bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black cursor-pointer"
          >
            질문 추가
          </button>
          {extraQuestions.length > 0 && (
            <div className="flex-1 text-[11px] text-neutral-500 dark:text-neutral-400 text-right">
              추가된 질문 {extraQuestions.length}개
            </div>
          )}
        </div>
        {extraQuestions.length > 0 && (
          <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto text-[11px] text-neutral-700 dark:text-neutral-200">
            {extraQuestions.map((q, idx) => (
              <li key={idx} className="flex gap-1 items-start">
                <span className="shrink-0">{idx + 1}.</span>
                <span className="whitespace-pre-wrap break-words flex-1">{q}</span>
                <button
                  type="button"
                  onClick={() => {
                    setExtraQuestions((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="shrink-0 ml-2 text-[10px] text-red-500 hover:underline"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <textarea
        readOnly
        value={finalText}
        placeholder="명식을 선택하면 프롬프트가 생성됩니다."
        className="w-full min-h-[320px] text-xs font-mono rounded-md border bg-neutral-50 dark:bg-neutral-800 p-2"
      />
    </div>
  );
}

function koreanAgeByYear(birthYear: number, targetYear: number): number {
  return targetYear - birthYear + 1;
}
