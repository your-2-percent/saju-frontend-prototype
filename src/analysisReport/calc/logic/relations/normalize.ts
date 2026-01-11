// features/AnalysisReport/logic/relations/normalize.ts

export const STEM_H2K: Record<string, string> = {
  "甲": "갑",
  "乙": "을",
  "丙": "병",
  "丁": "정",
  "戊": "무",
  "己": "기",
  "庚": "경",
  "辛": "신",
  "壬": "임",
  "癸": "계",
};

export const BRANCH_H2K: Record<string, string> = {
  "子": "자",
  "丑": "축",
  "寅": "인",
  "卯": "묘",
  "辰": "진",
  "巳": "사",
  "午": "오",
  "未": "미",
  "申": "신",
  "酉": "유",
  "戌": "술",
  "亥": "해",
};

export function normalizeGZ(raw: string): string {
  if (!raw) return "";
  const s = raw
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/[년월일시간지\-_.]/g, "");

  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;

  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) {
    const g = STEM_H2K[mHa[1]] ?? mHa[1];
    const z = BRANCH_H2K[mHa[2]] ?? mHa[2];
    return `${g}${z}`;
  }

  return "";
}

export const gzStem = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");
export const gzBranch = (gz: string) => (gz && gz.length >= 2 ? gz[1]! : "");
