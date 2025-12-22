import { toKoStem } from "@/shared/domain/간지/convert";

const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

const ORDER_INSI = ["인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자", "축"] as const;

function resolveHourBaseIndex(dayStem: string): number {
  const stem = toKoStem(dayStem);
  if (stem === "갑" || stem === "기") return 0;
  if (stem === "을" || stem === "경") return 2;
  if (stem === "병" || stem === "신") return 4;
  if (stem === "정" || stem === "임") return 6;
  return 8;
}

export function buildHourCandidates(dayStem: string, useInsi: boolean): string[] {
  const baseIndex = resolveHourBaseIndex(dayStem);
  const order = useInsi ? ORDER_INSI : BRANCHES_KO;
  return order.map((branch, i) => {
    const stem = STEMS_KO[(baseIndex + i) % 10] ?? STEMS_KO[0];
    return `${stem}${branch}`;
  });
}
