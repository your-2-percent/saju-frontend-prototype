// features/AnalysisReport/logic/relations/tables.ts

import type { KoBranch } from "./groups";

// 천간 합/충
export const STEM_HAP_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["갑", "기"], label: "갑기합" },
  { pair: ["을", "경"], label: "을경합" },
  { pair: ["병", "신"], label: "병신합" },
  { pair: ["정", "임"], label: "정임합" },
  { pair: ["무", "계"], label: "무계합" },
];

export const STEM_CHUNG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["갑", "경"], label: "갑경충" },
  { pair: ["을", "신"], label: "을신충" },
  { pair: ["병", "임"], label: "병임충" },
  { pair: ["정", "계"], label: "정계충" },
];

// 지지 육합/충/파/해/원진/귀문
export const BR_YUKHAP_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "축"], label: "자축합" },
  { pair: ["인", "해"], label: "인해합" },
  { pair: ["묘", "술"], label: "묘술합" },
  { pair: ["진", "유"], label: "진유합" },
  { pair: ["사", "신"], label: "사신합" },
  { pair: ["오", "미"], label: "오미합" },
];

export const BR_CHUNG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "오"], label: "자오충" },
  { pair: ["축", "미"], label: "축미충" },
  { pair: ["인", "신"], label: "인신충" },
  { pair: ["묘", "유"], label: "묘유충" },
  { pair: ["진", "술"], label: "진술충" },
  { pair: ["사", "해"], label: "사해충" },
];

export const BR_PA_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "유"], label: "자유파" },
  { pair: ["묘", "오"], label: "묘오파" },
  { pair: ["진", "축"], label: "진축파" },
  { pair: ["술", "미"], label: "술미파" },
  { pair: ["신", "해"], label: "신해파" },
  { pair: ["인", "사"], label: "인사파" },
];

export const BR_HAE_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "미"], label: "자미해" },
  { pair: ["축", "오"], label: "축오해" },
  { pair: ["인", "해"], label: "인해해" },
  { pair: ["묘", "진"], label: "묘진해" },
  { pair: ["사", "신"], label: "사신해" },
  { pair: ["유", "술"], label: "유술해" },
];

export const BR_WONJIN_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "미"], label: "자미원진" },
  { pair: ["인", "유"], label: "인유원진" },
  { pair: ["축", "오"], label: "축오원진" },
  { pair: ["묘", "신"], label: "묘신원진" },
  { pair: ["진", "해"], label: "진해원진" },
  { pair: ["사", "술"], label: "사술원진" },
];

export const BR_GWIMUN_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["인", "미"], label: "인미귀문" },
  { pair: ["묘", "신"], label: "묘신귀문" },
  { pair: ["진", "해"], label: "진해귀문" },
  { pair: ["사", "술"], label: "사술귀문" },
  { pair: ["자", "유"], label: "자유귀문" },
  { pair: ["축", "오"], label: "축오귀문" },
];

// 상형 / 삼형 / 자형
export const BR_SANGHYEONG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["인", "신"], label: "인신형" },
  { pair: ["인", "사"], label: "인사형" },
  { pair: ["사", "신"], label: "사신형" },
  { pair: ["축", "술"], label: "축술형" },
  { pair: ["축", "미"], label: "축미형" },
  { pair: ["술", "미"], label: "술미형" },
];

export const BR_ZAMYO_HYEONG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자", "묘"], label: "자묘형" },
];

export const BR_SELF_HYEONG_ALLOWED = new Set<KoBranch>(["진", "오", "유", "해"]);

// 같은-기둥 간지암합
export const GANJI_AMHAP_SET = new Set<string>(["정해", "무자", "신사", "임오"]);

// 지지 암합(지지+지지)
export const AMHAP_BR_LABELS: Array<{ pair: [KoBranch, KoBranch]; label: string }> = [
  { pair: ["자", "술"], label: "자술암합" },
  { pair: ["축", "인"], label: "축인암합" },
  { pair: ["묘", "신"], label: "묘신암합" },
  { pair: ["인", "미"], label: "인미암합" },
  { pair: ["오", "해"], label: "오해암합" },
];

// 지지 반합(삼합의 부분 조합)
export const BR_BANHAP_LABELS: Array<{ pair: [KoBranch, KoBranch]; label: string }> = [
  { pair: ["해", "묘"], label: "해묘반합" },
  { pair: ["묘", "미"], label: "묘미반합" },
  { pair: ["해", "미"], label: "해미반합" },

  { pair: ["인", "오"], label: "인오반합" },
  { pair: ["오", "술"], label: "오술반합" },
  { pair: ["인", "술"], label: "인술반합" },

  { pair: ["사", "유"], label: "사유반합" },
  { pair: ["유", "축"], label: "유축반합" },
  { pair: ["사", "축"], label: "사축반합" },

  { pair: ["신", "자"], label: "신자반합" },
  { pair: ["자", "진"], label: "자진반합" },
  { pair: ["신", "진"], label: "신진반합" },
];
