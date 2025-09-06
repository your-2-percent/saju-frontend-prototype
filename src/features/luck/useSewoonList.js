import { getYearGanZhi } from "@/shared/domain/간지/공통";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
export function getSewoonListInDaewoon(dae, nextDae) {
    const startYear = dae.at.getFullYear();
    const endYear = nextDae ? nextDae.at.getFullYear() : startYear + 10;
    const result = [];
    for (let y = startYear; y < endYear; y++) {
        // 해당 연도 입춘
        const ipchun = findSolarTermUTC(y, 315);
        let gzYear = y;
        const now = new Date();
        if (now < ipchun)
            gzYear = y - 1;
        const gz = getYearGanZhi(new Date(gzYear, 1, 10));
        result.push({ at: ipchun, gz });
    }
    return result;
}
