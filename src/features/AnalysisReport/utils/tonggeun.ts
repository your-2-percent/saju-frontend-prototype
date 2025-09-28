/* ── 한글↔한자 매핑 ── */
import { 천간, 지지, 간지_한자_MAP } from "@/shared/domain/간지/const";

const STEM_H2K: Record<string, string> = Object.fromEntries(간지_한자_MAP.천간.map((h,i)=>[h, 천간[i]]));
const STEM_K2H: Record<string, string> = Object.fromEntries(천간.map((k,i)=>[k, 간지_한자_MAP.천간[i]]));
const BRANCH_H2K: Record<string, string> = Object.fromEntries(간지_한자_MAP.지지.map((h,i)=>[h, 지지[i]]));
const BRANCH_K2H: Record<string, string> = Object.fromEntries(지지.map((k,i)=>[k, 간지_한자_MAP.지지[i]]));

const toKoStem   = (ch: string) => STEM_H2K[ch]   ?? ch;
const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;
const toCnStem   = (ch: string) => STEM_K2H[ch]   ?? ch;
const toCnBranch = (ch: string) => BRANCH_K2H[ch] ?? ch;

/* 한글 GZ 키를 한자 GZ 키로도 복제 */
function expandGZKeys<T>(src: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...src };
  for (const k of Object.keys(src)) {
    if (k.length < 2) continue;
    const s = k.charAt(0), b = k.charAt(1);
    const alt = /[甲乙丙丁戊己庚辛壬癸]/.test(s) || /[子丑寅卯辰巳午未申酉戌亥]/.test(b)
      ? `${toKoStem(s)}${toKoBranch(b)}`
      : `${toCnStem(s)}${toCnBranch(b)}`;
    if (out[alt] === undefined) out[alt] = src[k] as T;
  }
  return out;
}

/* ── 원본(한글) ── */
const HGC_KO: Record<string, number> = {
  "갑자": 1.0, "을축": 0.2, "병인": 1.0, "정묘": 1.0,
  "무진": 0.5, "기사": 0.7, "경오": 0.0, "신미": 0.5,
  "임신": 1.0, "계유": 1.0, "갑술": 0.0, "을해": 1.0,

  "병자": 0.0, "정축": 0.0, "무인": 0.3, "기묘": 0.0,
  "경진": 0.5, "신사": 0.3, "임오": 0.0, "계미": 0.0,
  "갑신": 0.3, "을유": 0.0, "병술": 0.8, "정해": 0.3,

  "무자": 0.0, "기축": 0.5, "경인": 0.0, "신묘": 0.0,
  "임진": 0.3, "계사": 0.3, "갑오": 0.0, "을미": 0.3,
  "병신": 0.0, "정유": 0.0, "무술": 0.8, "기해": 0.0,

  "경자": 0.0, "신축": 0.8, "임인": 0.0, "계묘": 0.0,
  "갑진": 0.5, "을사": 0.0, "병오": 1.0, "정미": 0.5,
  "무신": 0.0, "기유": 0.0, "경술": 0.7, "신해": 0.0,

  "임자": 1.0, "계축": 0.5, "갑인": 0.7, "을묘": 0.0,
  "병진": 0.2, "정사": 0.7, "무오": 1.0, "기미": 0.7,
  "경신": 0.7, "신유": 1.0, "임술": 0.2, "계해": 0.7,
};
const CLASSIC_KO: Record<string, number> = {
  ...HGC_KO,
  "병인": 0.8, "경오": 0.3, "무인": 0.5, "신사": 0.5,
  "경인": 0.2, "기해": 0.2, "병오": 0.8, "무신": 0.2,
};

/* ── export: 한글+한자 GZ 키 지원 ── */
export const TONGGEUN_HAGEONCHUNG: Record<string, number> = expandGZKeys(HGC_KO);
export const TONGGEUN_CLASSIC: Record<string, number> = expandGZKeys(CLASSIC_KO);
