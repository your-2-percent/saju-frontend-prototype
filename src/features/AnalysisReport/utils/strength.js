import { BRANCH_MAIN_ELEMENT, BRANCH_HIDDEN_STEMS_HGC, BRANCH_HIDDEN_STEMS_CLASSIC } from "./hiddenStem";
/**
 * Day Stem → Element
 */
const STEM_TO_ELEMENT = {
    갑: "목", 을: "목",
    병: "화", 정: "화",
    무: "토", 기: "토",
    경: "금", 신: "금",
    임: "수", 계: "수",
};
/** 생/극 관계 */
const SHENG_NEXT = {
    목: "화", 화: "토", 토: "금", 금: "수", 수: "목",
};
const SHENG_PREV = {
    화: "목", 토: "화", 금: "토", 수: "금", 목: "수",
};
const KE = {
    목: "토", 화: "금", 토: "수", 금: "목", 수: "화",
};
// 관성(= 나를 극하는 오행)
const KE_INV = {
    목: "금", 화: "수", 토: "목", 금: "화", 수: "토",
};
const ZERO_ELEM = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
const ZERO_TG = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
/* ────────────── 한자→한글 보정 ────────────── */
const STEM_H2K = {
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
    己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K = {
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
    午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const toKoStem = (ch) => STEM_H2K[ch] ?? ch;
const toKoBranch = (ch) => BRANCH_H2K[ch] ?? ch;
function toKoGZ(raw) {
    if (!raw || raw.length < 2)
        return "";
    return `${toKoStem(raw[0])}` + `${toKoBranch(raw[1])}`;
}
const gzStem = (gz) => (gz && gz.length >= 1 ? gz[0] : "");
const gzBranch = (gz) => (gz && gz.length >= 2 ? gz[1] : "");
/* =========================
 * 기존: 간단한 오행 강약(임시 규칙)
 * ========================= */
export function computeElementStrength(pillars) {
    const base = { ...ZERO_ELEM };
    for (const gz of pillars) {
        if (!gz || gz.length < 1)
            continue;
        const stem = gz.charAt(0);
        const el = STEM_TO_ELEMENT[stem];
        if (el)
            base[el] += 10; // 임시 가중치
    }
    return base;
}
export function computeTenGodStrength(pillars) {
    if (!pillars || pillars.length < 3 || !pillars[2] || pillars[2].length < 1) {
        return { ...ZERO_TG };
    }
    const dayStem = pillars[2].charAt(0);
    const dayEl = STEM_TO_ELEMENT[dayStem];
    if (!dayEl)
        return { ...ZERO_TG };
    const elemScore = computeElementStrength(pillars);
    const acc = { ...ZERO_TG };
    Object.entries(elemScore).forEach(([el, v]) => {
        if (v === 0)
            return;
        if (el === dayEl) {
            acc.비겁 += v;
        }
        else if (SHENG_NEXT[dayEl] === el) {
            acc.식상 += v;
        }
        else if (SHENG_PREV[dayEl] === el) {
            acc.인성 += v;
        }
        else if (KE[dayEl] === el) {
            acc.재성 += v;
        }
        else if (KE[el] === dayEl) {
            acc.관성 += v;
        }
        else {
            acc.비겁 += v;
        }
    });
    return acc;
}
export function computeStrengths(pillars) {
    const elements = computeElementStrength(pillars);
    const tenGods = computeTenGodStrength(pillars);
    return { elements, tenGods };
}
/** 분류별 대표 오행(일간 기준) */
export function getCategoryElementMap(dayEl) {
    return {
        비겁: dayEl,
        식상: SHENG_NEXT[dayEl],
        인성: SHENG_PREV[dayEl],
        재성: KE[dayEl],
        관성: KE_INV[dayEl],
    };
}
/** 어떤 오행이 일간 기준으로 어느 대분류에 해당하는지 */
function elementToCategory(el, dayEl) {
    if (el === dayEl)
        return "비겁";
    if (SHENG_NEXT[dayEl] === el)
        return "식상";
    if (SHENG_PREV[dayEl] === el)
        return "인성";
    if (KE[dayEl] === el)
        return "재성";
    if (KE[el] === dayEl)
        return "관성";
    return "비겁";
}
/** unknown 형태의 지장간 매핑에서 '천간 문자열'들을 뽑아내기 (type guard 기반) */
function extractStems(u) {
    if (typeof u === "string")
        return [toKoStem(u)];
    if (Array.isArray(u)) {
        const out = [];
        for (const item of u) {
            if (typeof item === "string")
                out.push(toKoStem(item));
            else if (item && typeof item === "object" && "stem" in item) {
                const s = item.stem;
                if (typeof s === "string")
                    out.push(toKoStem(s));
            }
        }
        return out;
    }
    if (u && typeof u === "object") {
        const out = [];
        for (const v of Object.values(u)) {
            out.push(...extractStems(v));
        }
        return out;
    }
    return [];
}
/** 지장간 → 오행 집합(모던 전용). 맵이 없거나 형식이 달라도 안전하게 동작. */
function hiddenElementsOfBranch(branch) {
    const m1 = BRANCH_HIDDEN_STEMS_HGC;
    const m2 = BRANCH_HIDDEN_STEMS_CLASSIC;
    const raw = (m1 && m1[branch] !== undefined) ? m1[branch] : (m2 ? m2[branch] : undefined);
    const stems = extractStems(raw);
    const els = [];
    for (const s of stems) {
        const el = STEM_TO_ELEMENT[s];
        if (el && !els.includes(el))
            els.push(el);
    }
    return els;
}
/**
 * pillars: (연월일시) 간지 배열. 한자/한글 섞여도 됨.
 * elementScoreRaw: 오행 원점수(정규화 전). computePowerDataDetailed().elementScoreRaw 입력 추천.
 * mode:
 *   - "classic": 월지/기지의 "정기"만 사용
 *   - "modern" : 지장간 전체(정·중·말) 중 하나라도 해당 분류이면 득령/득지
 * 득세: 대표 오행 점수 > 25 (두 모드 공통)
 */
export function computeDeukFlags(pillars, elementScoreRaw, mode = "classic") {
    const ko = (pillars ?? []).slice(0, 4).map(toKoGZ);
    if (ko.length !== 4 || ko.some((gz) => gz.length < 2)) {
        return {
            flags: {
                비겁: { 령: false, 지: false, 세: false },
                식상: { 령: false, 지: false, 세: false },
                재성: { 령: false, 지: false, 세: false },
                관성: { 령: false, 지: false, 세: false },
                인성: { 령: false, 지: false, 세: false },
            },
            monthBranch: "",
            dayEl: "토", // dummy
        };
    }
    const dayS = gzStem(ko[2]);
    const dayEl = dayS === "갑" || dayS === "을" ? "목" :
        dayS === "병" || dayS === "정" ? "화" :
            dayS === "무" || dayS === "기" ? "토" :
                dayS === "경" || dayS === "신" ? "금" : "수";
    const brs = ko.map((gz) => gzBranch(gz));
    const flags = {
        비겁: { 령: false, 지: false, 세: false },
        식상: { 령: false, 지: false, 세: false },
        재성: { 령: false, 지: false, 세: false },
        관성: { 령: false, 지: false, 세: false },
        인성: { 령: false, 지: false, 세: false },
    };
    const catMap = getCategoryElementMap(dayEl);
    // ── 득령: 월지 기준
    const monthB = brs[1];
    if (mode === "classic") {
        const el = BRANCH_MAIN_ELEMENT[monthB];
        if (el)
            flags[elementToCategory(el, dayEl)].령 = true;
    }
    else {
        // modern: 지장간 전체 중 하나라도 카테고리에 들어가면 득령
        const els = hiddenElementsOfBranch(monthB);
        if (els.length === 0) {
            const el = BRANCH_MAIN_ELEMENT[monthB];
            if (el)
                flags[elementToCategory(el, dayEl)].령 = true; // 폴백
        }
        else {
            for (const el of els) {
                flags[elementToCategory(el, dayEl)].령 = true;
            }
        }
    }
    // ── 득지: 연/일/시지 (월지는 제외)
    const idxs = [0, 2, 3];
    for (const i of idxs) {
        const b = brs[i];
        if (mode === "classic") {
            const el = BRANCH_MAIN_ELEMENT[b];
            if (el)
                flags[elementToCategory(el, dayEl)].지 = true;
        }
        else {
            const els = hiddenElementsOfBranch(b);
            if (els.length === 0) {
                const el = BRANCH_MAIN_ELEMENT[b];
                if (el)
                    flags[elementToCategory(el, dayEl)].지 = true; // 폴백
            }
            else {
                for (const el of els) {
                    flags[elementToCategory(el, dayEl)].지 = true;
                }
            }
        }
    }
    // ── 득세: 대표 오행 점수 > 25 (공통)
    Object.entries(catMap).forEach(([cat, el]) => {
        flags[cat].세 = (elementScoreRaw[el] ?? 0) > 25;
    });
    return { flags, monthBranch: monthB, dayEl };
}
