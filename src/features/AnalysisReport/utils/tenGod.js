/* 한자→한글 보정(일간/오행 모두 커버) */
const STEM_H2K = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무", "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const EL_H2K = { "木": "목", "火": "화", "土": "토", "金": "금", "水": "수" };
/**
 * 오행 → 십성 변환 (dayStem은 한글/한자 모두 허용)
 * @param element 오행 ("목" | "화" | "토" | "금" | "수")
 * @param dayStem 일간 (예: "갑"/"甲" ...)
 */
export function mapElementsToTenGods(element, dayStem) {
    const dayStemKo = STEM_H2K[dayStem] ?? dayStem; // 한자 들어와도 한글화
    const stemToElement = {
        갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
    };
    const dayEl = stemToElement[dayStemKo];
    if (!dayEl)
        return "비겁"; // 안전장치
    // 혹시 element가 잘못 들어오면(타입 밖) 한자→한글 보정
    const el = ["목", "화", "토", "금", "수"].includes(element) ? element : (EL_H2K[element] ?? "목");
    if (el === dayEl)
        return "비겁";
    const 生 = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
    const 克 = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
    if (生[dayEl] === el)
        return "식상"; // 내가 생하는 것
    if (生[el] === dayEl)
        return "인성"; // 나를 생하는 것
    if (克[dayEl] === el)
        return "재성"; // 내가 극하는 것
    if (克[el] === dayEl)
        return "관성"; // 나를 극하는 것
    return "비겁";
}
