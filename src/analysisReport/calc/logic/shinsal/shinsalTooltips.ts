// features/AnalysisReport/logic/shinsal/shinsalTooltips.ts
// 신살 툴팁: raw label(#연지_태백, #일지X시지_곤랑도화, 자오원진, 자묘귀문 등) → 설명 매칭

export type ShinsalKind = "길" | "흉" | "중립";

export type ShinsalTooltip = {
  title: string;
  kind: ShinsalKind;
  oneLine: string;
  bullets?: string[];
  aka?: string[];
};

export function normalizeShinsalKey(raw: string): string {
  const s0 = raw.trim();
  const s1 = s0.replace(/^#?(연지|월지|일지|시지)(X(연지|월지|일지|시지))?_/u, "");
  const s2 = s1.replace(/\((연지|월지|일지|시지)\)$/u, "");
  const s3 = s2.replace(/\s+/g, " ").trim();
  const s4 = s3.includes("_") ? s3.split("_").pop() ?? s3 : s3;

  if (s4.includes("귀문")) return "귀문";
  if (s4.includes("원진")) return "원진";
  if (s4.includes("공망")) return "공망";

  if (s4 === "비염" || s4 === "비렴" || s4 === "비렴살") return "비렴";

  return s4;
}

export const TOOLTIP: Record<string, ShinsalTooltip> = {
  태백: {
    title: "태백(太白)",
    kind: "흉",
    oneLine: "손재·변동·기복이 큰 흐름으로 보는 흉살 계열.",
    bullets: ["기세가 강하면 ‘밀어붙임’, 약하면 손실·기복으로 풀이."],
  },
  오귀: {
    title: "오귀(五鬼)",
    kind: "흉",
    oneLine: "예상치 못한 문제·잡음·손재로 보는 흉살.",
  },
  고신: {
    title: "고신(孤神)",
    kind: "흉",
    oneLine: "고독·단절·별거·이별 쪽으로 강하게 작동하는 흉살.",
  },
  과숙: {
    title: "과숙(寡宿)",
    kind: "흉",
    oneLine: "배우자·동거 운이 약해지는 쪽: 늦은 결혼·별거·독신 이미지.",
  },
  수옥: {
    title: "수옥(囚獄) / 재살",
    kind: "흉",
    oneLine: "구속·제약·분쟁 이슈로 상징화하는 살.",
  },
  단명: {
    title: "단명(短命)",
    kind: "흉",
    oneLine: "기력 소모·컨디션 하락 상징으로 읽음.",
  },
  천모: {
    title: "천모(天耗)",
    kind: "흉",
    oneLine: "소모·지출·새는 돈으로 읽는 흉살.",
  },
  지모: {
    title: "지모(地耗)",
    kind: "흉",
    oneLine: "지출·재물 누수, 기반 흔들림으로 읽는 흉살.",
  },
  대모: {
    title: "대모(大耗)",
    kind: "흉",
    oneLine: "큰 지출·큰 손재(규모 큰 소모)로 해석.",
  },
  소모: {
    title: "소모(小耗)",
    kind: "흉",
    oneLine: "자잘하게 새는 돈·자잘한 손재로 읽는 살.",
  },
  격각: {
    title: "격각(隔角)",
    kind: "흉",
    oneLine: "충돌·막힘·각 세움으로 읽는 흉살 계열.",
  },
  파군: {
    title: "파군(破軍)",
    kind: "흉",
    oneLine: "판 깨짐·손상·과감한 파괴/정리로 풀이.",
  },
  구신: {
    title: "구신(句神)",
    kind: "흉",
    oneLine: "구설·시비·말로 인한 손상으로 읽는 살.",
  },
  교신: {
    title: "교신(絞神)",
    kind: "흉",
    oneLine: "억압·꼬임·걸림(매듭) 이미지로 읽는 흉살.",
  },
  반음: {
    title: "반음(反吟)",
    kind: "흉",
    oneLine: "반대로 뒤집히는 형세(불협·변동)로 보는 개념.",
  },
  복음: {
    title: "복음(伏吟)",
    kind: "흉",
    oneLine: "같은 기운 반복: 정체·되풀이로 보는 개념.",
  },
  병부: {
    title: "병부(病符)",
    kind: "흉",
    oneLine: "몸·생활 리듬이 흐트러지는 경고성 살.",
  },
  사부: {
    title: "사부(死符)",
    kind: "흉",
    oneLine: "관재+구설 쪽 불길한 신호로 보는 살.",
  },
  관부: {
    title: "관부(官符)",
    kind: "흉",
    oneLine: "법/공문/행정/관청 이슈로 읽는 흉살.",
  },
  태음: {
    title: "태음(太陰)",
    kind: "흉",
    oneLine: "내면·은밀함·우울·지연으로 작동하는 그림자형 흉살.",
  },
  세파: {
    title: "세파(歲破)",
    kind: "흉",
    oneLine: "깨짐·파손·틀어짐 이슈로 읽는 흉살.",
  },
  천구: {
    title: "천구(天拘)",
    kind: "흉",
    oneLine: "액난·손재·사고성 이슈로 읽는 흉살.",
  },
  비렴: {
    title: "비렴(飛廉) / 비염",
    kind: "흉",
    oneLine: "급작스런 손상·시비·불안정으로 읽는 흉살.",
  },
  매아: {
    title: "매아(埋兒)",
    kind: "흉",
    oneLine: "상실·단절 이미지를 강하게 쓰는 흉살.",
  },
  탕화: {
    title: "탕화(湯火)",
    kind: "흉",
    oneLine: "불/열/데임 같은 사고성 상징으로 읽는 흉살.",
  },
  천덕귀인: {
    title: "천덕귀인(天德貴人)",
    kind: "길",
    oneLine: "덕으로 풀리는 귀인: 위기 완화·구제 이미지.",
  },
  월덕귀인: {
    title: "월덕귀인(月德貴人)",
    kind: "길",
    oneLine: "월 단위로 덕이 작동: 평판/보호/완충.",
  },
  천덕합: {
    title: "천덕합",
    kind: "길",
    oneLine: "천덕의 합 작용: 완충·원만한 타협 쪽.",
  },
  월덕합: {
    title: "월덕합",
    kind: "길",
    oneLine: "월덕의 합 작용: 갈등 완화·조정.",
  },
  혈지: {
    title: "혈지(血支)",
    kind: "흉",
    oneLine: "피/상처/수술 같은 손상 이미지가 강한 살.",
  },
  금쇄: {
    title: "금쇄(金鎖)",
    kind: "흉",
    oneLine: "막힘·구속·잠금 이미지로 읽는 관살 계열.",
  },
  급각살: {
    title: "급각살(急脚殺)",
    kind: "흉",
    oneLine: "급작스런 사고/다침/급변으로 읽는 살.",
  },
  단교관살: {
    title: "단교관살(斷橋關殺)",
    kind: "흉",
    oneLine: "끊김·단절 이미지로 해석하는 관살.",
  },
  부벽살: {
    title: "부벽살(浮壁殺)",
    kind: "흉",
    oneLine: "기반이 뜨는 느낌: 불안정·흔들림.",
  },
  욕분관살: {
    title: "욕분관살(浴盆關殺)",
    kind: "흉",
    oneLine: "관살류: 사고/손상·불편 이슈로 해석.",
  },
  사주관살: {
    title: "사주관살",
    kind: "흉",
    oneLine: "관재·시비·규제 같은 관살류 패턴을 묶어 보는 개념.",
  },
  천의성: {
    title: "천의성(天醫星)",
    kind: "길",
    oneLine: "회복·치유·도움 받는 운으로 상징화.",
  },
  천희신: {
    title: "천희신(天喜神)",
    kind: "길",
    oneLine: "기쁨·경사·좋은 소식의 상징.",
  },
  황은대사: {
    title: "황은대사(皇恩大赦)",
    kind: "길",
    oneLine: "큰 사면/구제 이미지: 막힌 일 풀림.",
  },
  홍란성: {
    title: "홍란성(紅鸞星)",
    kind: "길",
    oneLine: "연애·혼사·인기운(도화) 성격의 길성.",
  },
  장수성: {
    title: "장수성(長壽星)",
    kind: "길",
    oneLine: "회복력·버팀·장수 이미지로 쓰는 길성.",
  },
  천사: {
    title: "천사(天赦)",
    kind: "길",
    oneLine: "용서/사면 이미지: 풀어주는 기운.",
  },
  진신: {
    title: "진신(進神)",
    kind: "길",
    oneLine: "전진·상승·진행이 붙는 신살로 해석.",
  },
  천전살: {
    title: "천전살(天轉殺)",
    kind: "흉",
    oneLine: "변동·사고성 이슈로 보는 살.",
  },
  지전살: {
    title: "지전살(地轉殺)",
    kind: "흉",
    oneLine: "흔들림·다침 등으로 해석하는 편.",
  },
  태극귀인: {
    title: "태극귀인(太極貴人)",
    kind: "길",
    oneLine: "큰 도움/귀인의 완충: 위기 때 길이 열림.",
  },
  천을귀인: {
    title: "천을귀인(天乙貴人)",
    kind: "길",
    oneLine: "대표 귀인: 어려울 때 도움/구제 쪽.",
  },
  천주귀인: {
    title: "천주귀인",
    kind: "길",
    oneLine: "보호·보완성 귀인으로 해석하는 편.",
  },
  천관귀인: {
    title: "천관귀인(天官貴人)",
    kind: "길",
    oneLine: "관(官) 도움/명예/직·역할 쪽으로 풀이.",
  },
  천복귀인: {
    title: "천복귀인(天福貴人)",
    kind: "길",
    oneLine: "복의 완충: 덜 다치고 덜 손해 보는 쪽.",
  },
  문창귀인: {
    title: "문창귀인(文昌貴人)",
    kind: "길",
    oneLine: "문서·공부·기획·표현력에 강점.",
  },
  암록: {
    title: "암록(暗祿)",
    kind: "길",
    oneLine: "드러나지 않는 복록: 은근히 이득.",
  },
  금여록: {
    title: "금여록(金輿祿)",
    kind: "길",
    oneLine: "복록/지위/보호 이미지로 읽는 록 계열.",
  },
  협록: {
    title: "협록(協祿)",
    kind: "길",
    oneLine: "도움 받아 록이 붙는 형상: 협력운.",
  },
  관귀학관: {
    title: "관귀학관",
    kind: "길",
    oneLine: "관·학 쪽으로 길: 자격/시험/평판운.",
  },
  문곡귀인: {
    title: "문곡귀인(文曲貴人)",
    kind: "길",
    oneLine: "문장·예술·감수성/표현력 쪽 강점.",
  },
  학당귀인: {
    title: "학당귀인(學堂貴人)",
    kind: "길",
    oneLine: "학습·자격·연구 쪽으로 길: 공부운.",
  },
  십간록: {
    title: "십간록(十干祿)",
    kind: "길",
    oneLine: "일간의 록: 생계/성취 기반 보강.",
  },
  재고귀인: {
    title: "재고귀인(財庫貴人)",
    kind: "길",
    oneLine: "재물의 저장고 이미지: 모으는 힘.",
  },
  홍염: {
    title: "홍염(紅艶)",
    kind: "중립",
    oneLine: "매력·연애 이슈(도화성)로 작동.",
  },
  유하: {
    title: "유하(流霞)",
    kind: "흉",
    oneLine: "관계·정서 쪽 상처, 스캔들·구설 이미지가 있는 흉살.",
  },
  낙정관살: {
    title: "낙정관살",
    kind: "흉",
    oneLine: "관살류: 시비·관재·걸림 이슈.",
  },
  효신살: {
    title: "효신살",
    kind: "흉",
    oneLine: "삐끗한 선택/꼬임으로 해석하는 흉살.",
  },
  음착살: {
    title: "음착살(陰錯)",
    kind: "흉",
    oneLine: "어긋남/착오 이미지: 엇박으로 풀이.",
  },
  양착살: {
    title: "양착살(陽錯)",
    kind: "흉",
    oneLine: "엇갈림/착오 이미지: 타이밍 미스·충돌.",
  },
  고란살: {
    title: "고란살(孤鸞)",
    kind: "흉",
    oneLine: "배우자 인연이 끊기거나 늦어지는 ‘외로운 난새’ 이미지: 독립성·관계 고독이 강한 살.",
  },
  비인살: {
    title: "비인살",
    kind: "흉",
    oneLine: "날카로운 손상·충돌 이미지로 읽는 살.",
  },
  양인살: {
    title: "양인살(羊刃)",
    kind: "중립",
    oneLine: "직선적 추진력·승부욕. 강하면 다툼·충돌까지 동반할 수 있는 중립 살.",
  },
  괴강살: {
    title: "괴강살(魁罡)",
    kind: "중립",
    oneLine: "기개·카리스마·강한 결단. 과하면 권위충돌·관재로도 번질 수 있음.",
  },
  백호대살: {
    title: "백호대살(白虎大殺)",
    kind: "흉",
    oneLine: "칼·수술·사고·큰 손상 이미지. 강하게 들어오면 건강·사고 이슈를 경고하는 흉살.",
  },
  천라지망: {
    title: "천라지망(天羅地網)",
    kind: "흉",
    oneLine: "그물에 걸림: 막힘·구속 상징.",
  },
  현침살: {
    title: "현침살(懸針)",
    kind: "흉",
    oneLine: "바늘 같은 날카로움: 상처·말의 칼날.",
  },
  절로공망: {
    title: "절로공망(絶路空亡)",
    kind: "흉",
    oneLine: "길이 끊기는 공망 이미지: 진행 막힘.",
  },
  편야도화: {
    title: "편야도화(偏野桃花)",
    kind: "중립",
    oneLine: "비정형 도화: 튀는 매력/이슈, 특이한 이성운·관계 패턴.",
  },
  곤랑도화: {
    title: "곤랑도화",
    kind: "흉",
    oneLine: "관계 문제·스캔들·복잡한 삼각관계로 번지기 쉬운 비틀린 도화.",
  },
  도삽도화: {
    title: "도삽도화(倒揷桃花)",
    kind: "중립",
    oneLine: "극단적/특이하게 드러나는 도화: 매력도 강하지만 파장도 큼.",
  },
  녹마동향: {
    title: "녹마동향(祿馬同鄕)",
    kind: "길",
    oneLine: "록·마가 같은 방향: 성취 추진에 도움.",
  },
  록마교치: {
    title: "록마교치(祿馬交馳)",
    kind: "길",
    oneLine: "록과 마가 교차: 일/성과가 빨리 붙음.",
  },
  천록천마: {
    title: "천록천마(天祿天馬)",
    kind: "길",
    oneLine: "큰 록·큰 마: 이동/확장/성과로 풀이.",
  },
  평두살: {
    title: "평두살(平頭煞)",
    kind: "흉",
    oneLine: "기세가 꺾이기 쉬운 상징: 진행 막힘.",
  },
  곡각살: {
    title: "곡각살(曲脚殺)",
    kind: "흉",
    oneLine: "다리/발/진행의 삐끗함 이미지로 풀이.",
  },
  원진: {
    title: "원진(怨嗔)",
    kind: "흉",
    oneLine: "미움/서운함이 쌓이는 인연: 관계 피로.",
  },
  귀문: {
    title: "귀문(鬼門)",
    kind: "흉",
    oneLine: "막힘/불안 상징으로 쓰는 경우가 많음.",
  },
  공망: {
    title: "공망(空亡)",
    kind: "중립",
    oneLine: "비어 있음: 힘이 잘 안 붙거나, 결과가 늦게/약하게 드러나는 패턴.",
  },
};


export function getShinsalTooltip(rawLabel: string): ShinsalTooltip | null {
  const key = normalizeShinsalKey(rawLabel);
  const direct = TOOLTIP[key];
  if (direct) return direct;

  if (key.endsWith("살")) {
    const trimmed = key.replace(/살$/, "");
    if (TOOLTIP[trimmed]) return TOOLTIP[trimmed];
  } else {
    const withSal = `${key}살`;
    if (TOOLTIP[withSal]) return TOOLTIP[withSal];
  }

  return {
    title: key || "신살",
    kind: "중립",
    oneLine: "설명 준비중",
  };
}

export function formatShinsalTooltipText(t: ShinsalTooltip): string {
  const head = `${t.title} · ${t.kind}`;
  const line1 = t.oneLine;
  const bullets = (t.bullets ?? []).map((b) => `- ${b}`).join("\n");
  return bullets ? `${head}\n${line1}\n${bullets}` : `${head}\n${line1}`;
}
