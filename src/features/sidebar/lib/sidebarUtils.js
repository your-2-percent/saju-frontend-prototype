import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
/** 폴더명 유니크 생성 */
export function uniqueFolderName(base, existingList) {
    const existing = new Set(existingList);
    if (!existing.has(base))
        return base;
    let i = 2;
    while (existing.has(`${base} ${i}`))
        i++;
    return `${base} ${i}`;
}
export function fmtBirthKR(yyyymmdd, hhmm) {
    if (!/^\d{8}$/.test(yyyymmdd))
        return yyyymmdd || "";
    const y = yyyymmdd.slice(0, 4);
    const m = yyyymmdd.slice(4, 6);
    const d = yyyymmdd.slice(6, 8);
    if (hhmm && /^\d{4}$/.test(hhmm))
        return `${y}년 ${m}월 ${d}일생 ${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}분`;
    if (hhmm === "모름")
        return `${y}년 ${m}월 ${d}일생 (시간 모름)`;
    return `${y}년 ${m}월 ${d}일생`;
}
export function formatPlaceDisplay(name) {
    if (!name)
        return "";
    const parts = name.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    const hasLevel = (suffixes) => parts.find((p) => suffixes.some((s) => p.endsWith(s)));
    const upper = hasLevel(["시", "군", "구"]);
    const lower = hasLevel(["동", "읍", "면", "리"]);
    const isCountryOnly = parts.length === 1 ||
        (!hasLevel(["시", "군", "구", "동", "읍", "면", "리"]) &&
            !hasLevel(["도", "광역시", "특별시", "자치시", "자치도"]));
    if (isCountryOnly)
        return name;
    if (upper && lower)
        return `${upper} ${lower}`;
    if (upper)
        return upper;
    return name;
}
export function fmtLatLon(m) {
    const lat = m.birthPlace?.lat;
    const lon = m.birthPlace?.lon;
    const latStr = typeof lat === "number" ? lat.toFixed(4) : "-";
    const lonStr = typeof lon === "number" ? lon.toFixed(4) : "-";
    return `위도 ${latStr} / 경도 ${lonStr}`;
}
export function calcAgeFromBirthDay(yyyymmdd) {
    if (!/^\d{8}$/.test(yyyymmdd))
        return "-";
    const y = Number(yyyymmdd.slice(0, 4));
    const m = Number(yyyymmdd.slice(4, 6));
    const d = Number(yyyymmdd.slice(6, 8));
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d))
        age--;
    return age;
}
export function getCorrectedLocal(m) {
    if (m.correctedLocal)
        return m.correctedLocal;
    if (!m.birthDay)
        return "";
    if (m.birthTime === "모름" || !m.birthTime)
        return "";
    const y = Number(m.birthDay.slice(0, 4));
    const mo = Number(m.birthDay.slice(4, 6)) - 1;
    const d = Number(m.birthDay.slice(6, 8));
    const hh = Number(m.birthTime.slice(0, 2));
    const mi = Number(m.birthTime.slice(2, 4));
    const raw = new Date(y, mo, d, hh, mi, 0, 0);
    const corr = getCorrectedDate(raw, m.birthPlace?.lon ?? null);
    // ✅ 직접 포매팅으로 24시간제 보장 (16:30 형식)
    const hours = corr.getHours().toString().padStart(2, '0');
    const minutes = corr.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
/** 저장된 간지 문자열 정리 (개행/공백, null시 제거) */
export function getGanjiString(m) {
    return (m.ganji ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\s*null시\s*/gi, "")
        .trim();
}
