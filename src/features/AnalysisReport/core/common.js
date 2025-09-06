/** 한자↔한글 매핑 */
export const STEM_H2K = {
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
    己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
export const BRANCH_H2K = {
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
    午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
export const STEM_K2H = Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
export const BRANCH_K2H = Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));
/** 천간/지지 → 오행 */
export const STEM_TO_ELEMENT = {
    갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토",
    경: "금", 신: "금", 임: "수", 계: "수",
};
export const BRANCH_MAIN_ELEMENT = {
    자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
    오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
/** 간지 정규화 */
export function normalizeGZ(raw) {
    if (!raw)
        return "";
    const s = raw.replace(/[()[\]{}]/g, "")
        .replace(/\s+/g, "")
        .replace(/[년월일시年月日時干支柱:\-_.]/g, "");
    const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
    if (mKo)
        return `${mKo[1]}${mKo[2]}`;
    const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
    if (mHa)
        return `${STEM_H2K[mHa[1]]}${BRANCH_H2K[mHa[2]]}`;
    return "";
}
export function normalizePillars(input) {
    const arr = Array.isArray(input) ? input.slice(0, 4) : [];
    while (arr.length < 4)
        arr.push("");
    return arr.map(normalizeGZ);
}
export function isValidPillars(p) {
    return p.length === 4 && p.every((x) => x.length === 2);
}
/** 한자/한글 표시 */
export function toDisplayChar(value, kind, charType) {
    if (charType === "한글") {
        return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
    }
    return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}
/** 음간/음지 판별(통합셋) */
export const YIN_STEMS_ALL = new Set(["乙", "丁", "己", "辛", "癸", "을", "정", "기", "신", "계"]);
export const YIN_BRANCHES_ALL = new Set(["丑", "卯", "巳", "未", "酉", "亥", "축", "묘", "사", "미", "유", "해"]);
export function isYinUnified(value, kind) {
    return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}
/** 문자열 → 오행 라벨 정규화 */
export function normElLabel(raw) {
    if (typeof raw !== "string")
        return null;
    if (/목|木|wood/i.test(raw))
        return "목";
    if (/화|火|fire/i.test(raw))
        return "화";
    if (/토|土|earth/i.test(raw))
        return "토";
    if (/금|金|metal/i.test(raw))
        return "금";
    if (/수|水|water/i.test(raw))
        return "수";
    return null;
}
/** 안전 타입 체크 */
export function isRecord(v) {
    return typeof v === "object" && v !== null;
}
