// features/luck/daewoonList.ts
import type { MyeongSik } from "@/shared/lib/storage";
import { buildWolju } from "@/features/myoun";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { Direction } from "@/shared/type";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";

export function getDaewoonList(
  ms: MyeongSik
): string[] {
  const birth = new Date(ms.corrected);

  const natal = buildNatalPillarsFromMs(ms);
  // 2) 성별 + 연간 음양으로 순행/역행 판정
  const yearStem = natal[0].charAt(0);
  const yangStems = ["갑", "병", "무", "경", "임"];
  const isYearYang = yangStems.includes(yearStem);
  const isMale = ms.gender === "남자";
  const dir: Direction =
    (isMale && isYearYang) || (!isMale && !isYearYang) ? "forward" : "backward";

  // 3) 월주 기준 대운 계산
  const wolju = buildWolju(birth, natal[1], dir, 120, ms.birthPlace?.lon ?? 127.5);

  // ✅ firstWoljuChange 기반으로 첫 대운 시작
  const firstChange = wolju.firstChange;
  if (!firstChange) return [];

  const list: string[] = [];
  let cur = normalizeGZ(wolju.events[0]?.gz ?? natal[1]);

  for (let i = 0; i < 10; i++) {
    const at = new Date(firstChange);
    at.setFullYear(at.getFullYear() + i * 10);

    // i=0 → wolju.events[0].gz, 이후는 +10년씩
    if (i > 0) {
      const ev = wolju.events[i];
      if (ev) cur = normalizeGZ(ev.gz);
    }

    list.push(
      `${at.getFullYear()}년 ${String(at.getMonth() + 1).padStart(2, "0")}월 ${cur} 대운 시작`
    );
  }

  return list;
}
