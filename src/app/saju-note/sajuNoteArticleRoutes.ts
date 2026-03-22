import type { ComponentType } from "react";
import SajuNoteYinYangPage from "@/app/saju-note/SajuNoteYinYangPage";
import SajuNoteFiveElementsPage from "@/app/saju-note/SajuNoteFiveElementsPage";
import SajuNoteCheonganPage from "@/app/saju-note/SajuNoteCheonganPage";
import SajuNoteJijiPage from "@/app/saju-note/SajuNoteJijiPage";
import SajuNoteSipsinPage from "@/app/saju-note/SajuNoteSipsinPage";
import SajuNoteTonggeunAndTuchulPage from "@/app/saju-note/SajuNoteTonggeunAndTuchulPage";
import SajuNoteHyeongChungHoiHapPage from "@/app/saju-note/SajuNoteHyeongChungHoiHapPage";
import SajuNoteEightLettersMeaningPage from "@/app/saju-note/SajuNoteEightLettersMeaningPage";
import SajuNoteTerminologyPage from "@/app/saju-note/SajuNoteTerminologyPage";
import SajuNoteIljuronWhyNotAlwaysCorrectPage from "@/app/saju-note/SajuNoteIljuronWhyNotAlwaysCorrectPage";
import SajuNoteSolarPositionAndTimeCorrectionPage from "@/app/saju-note/SajuNoteSolarPositionAndTimeCorrectionPage";
import SajuNoteOhangMulssangPage from "@/app/saju-note/SajuNoteOhangMulssangPage";
import SajuNoteGyeokgukPage from "@/app/saju-note/SajuNoteGyeokgukPage";
import SajuNoteSibiUnseongPage from "@/app/saju-note/SajuNoteSibiUnseongPage";
import SajuNoteSibiUnseong2Page from "@/app/saju-note/SajuNoteSibiUnseong2Page";
import SajuNoteSibiSinsalPage from "@/app/saju-note/SajuNoteSibiSinsalPage";
import SajuNoteJijangganPage from "@/app/saju-note/SajuNoteJijangganPage";
import SajuNoteManseryeokPage from "@/app/saju-note/SajuNoteManseryeokPage";
import SajuNoteSajuCase1Page from "@/app/saju-note/SajuNoteSajuCase1Page";
import SajuNoteSajuCase2Page from "@/app/saju-note/SajuNoteSajuCase2Page";

export type SajuNoteArticleRoute = {
  slug: string;
  path: string;
  Component: ComponentType;
};

export const SAJU_NOTE_ARTICLE_ROUTES: SajuNoteArticleRoute[] = [
  { slug: "yin-yang", path: "/saju-note/yin-yang/*", Component: SajuNoteYinYangPage },
  { slug: "five-elements", path: "/saju-note/five-elements/*", Component: SajuNoteFiveElementsPage },
  { slug: "cheongan", path: "/saju-note/cheongan/*", Component: SajuNoteCheonganPage },
  { slug: "jiji", path: "/saju-note/jiji/*", Component: SajuNoteJijiPage },
  { slug: "sipsin", path: "/saju-note/sipsin/*", Component: SajuNoteSipsinPage },
  { slug: "tonggeun-and-tuchul", path: "/saju-note/tonggeun-and-tuchul/*", Component: SajuNoteTonggeunAndTuchulPage },
  { slug: "hyeong-chung-hoi-hap", path: "/saju-note/hyeong-chung-hoi-hap/*", Component: SajuNoteHyeongChungHoiHapPage },
  { slug: "eight-letters-meaning", path: "/saju-note/eight-letters-meaning/*", Component: SajuNoteEightLettersMeaningPage },
  { slug: "terminology", path: "/saju-note/terminology/*", Component: SajuNoteTerminologyPage },
  { slug: "iljuron-why-not-always-correct", path: "/saju-note/iljuron-why-not-always-correct/*", Component: SajuNoteIljuronWhyNotAlwaysCorrectPage },
  { slug: "solar-position-and-time-correction", path: "/saju-note/solar-position-and-time-correction/*", Component: SajuNoteSolarPositionAndTimeCorrectionPage },
  { slug: "ohang-mulssang", path: "/saju-note/ohang-mulssang/*", Component: SajuNoteOhangMulssangPage },
  { slug: "gyeokguk", path: "/saju-note/gyeokguk/*", Component: SajuNoteGyeokgukPage },
  { slug: "sibi-unseong", path: "/saju-note/sibi-unseong/*", Component: SajuNoteSibiUnseongPage },
  { slug: "sibi-unseong-2", path: "/saju-note/sibi-unseong-2/*", Component: SajuNoteSibiUnseong2Page },
  { slug: "sibi-sinsal", path: "/saju-note/sibi-sinsal/*", Component: SajuNoteSibiSinsalPage },
  { slug: "jijanggan", path: "/saju-note/jijanggan/*", Component: SajuNoteJijangganPage },
  { slug: "manseryeok", path: "/saju-note/manseryeok/*", Component: SajuNoteManseryeokPage },
  { slug: "saju-case-1", path: "/saju-note/saju-case-1/*", Component: SajuNoteSajuCase1Page },
  { slug: "saju-case-2", path: "/saju-note/saju-case-2/*", Component: SajuNoteSajuCase2Page },
];
