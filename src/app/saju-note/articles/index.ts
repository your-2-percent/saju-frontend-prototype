import { YinYangArticle } from "@/app/saju-note/articles/yin-yang";
import { FiveElementsArticle } from "@/app/saju-note/articles/five-elements";
import { CheonganArticle } from "@/app/saju-note/articles/cheongan";
import { JijiArticle } from "@/app/saju-note/articles/jiji";
import { SipsinArticle } from "@/app/saju-note/articles/sipsin";
import { TonggeunAndTuchulArticle } from "@/app/saju-note/articles/tonggeun-and-tuchul";
import { HyeongChungHoiHapArticle } from "@/app/saju-note/articles/hyeong-chung-hoi-hap";
import { EightLettersMeaningArticle } from "@/app/saju-note/articles/eight-letters-meaning";
import { TerminologyArticle } from "@/app/saju-note/articles/terminology";
import { IljuronWhyNotAlwaysCorrectArticle } from "@/app/saju-note/articles/iljuron-why-not-always-correct";
import { SolarPositionAndTimeCorrectionArticle } from "@/app/saju-note/articles/solar-position-and-time-correction";
import { OhangMulssangArticle } from "@/app/saju-note/articles/ohang-mulssang";
import { GyeokgukArticle } from "@/app/saju-note/articles/gyeokguk";
import { JijangganArticle } from "@/app/saju-note/articles/jijanggan";
import { ManseryeokArticle } from "@/app/saju-note/articles/manseryeok";
import type { SajuNoteArticle } from "@/app/saju-note/articles/articleTypes";

export type { SajuNoteArticle } from "@/app/saju-note/articles/articleTypes";

export const SAJU_NOTE_ARTICLES: SajuNoteArticle[] = [
  YinYangArticle,
  FiveElementsArticle,
  CheonganArticle,
  JijiArticle,
  JijangganArticle,
  SipsinArticle,
  TonggeunAndTuchulArticle,
  HyeongChungHoiHapArticle,
  EightLettersMeaningArticle,
  TerminologyArticle,
  IljuronWhyNotAlwaysCorrectArticle,
  SolarPositionAndTimeCorrectionArticle,
  OhangMulssangArticle,
  GyeokgukArticle,
  ManseryeokArticle,
];

export const SAJU_NOTE_ARTICLE_BY_SLUG: Record<string, SajuNoteArticle> = {
  "yin-yang": YinYangArticle,
  "five-elements": FiveElementsArticle,
  "cheongan": CheonganArticle,
  "jiji": JijiArticle,
  "jijanggan": JijangganArticle,
  "sipsin": SipsinArticle,
  "tonggeun-and-tuchul": TonggeunAndTuchulArticle,
  "hyeong-chung-hoi-hap": HyeongChungHoiHapArticle,
  "eight-letters-meaning": EightLettersMeaningArticle,
  "terminology": TerminologyArticle,
  "iljuron-why-not-always-correct": IljuronWhyNotAlwaysCorrectArticle,
  "solar-position-and-time-correction": SolarPositionAndTimeCorrectionArticle,
  "ohang-mulssang": OhangMulssangArticle,
  "gyeokguk": GyeokgukArticle,
  "manseryeok": ManseryeokArticle,
};
