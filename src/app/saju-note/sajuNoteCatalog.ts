export type SajuNoteItem = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type SajuNoteCategory = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  badgeClass: string;
  borderClass: string;
  items: SajuNoteItem[];
};

export const SAJU_NOTE_CATEGORIES: SajuNoteCategory[] = [
  {
    key: "yinyang",
    title: "음양",
    subtitle: "음양(陰陽)",
    description: "음양의 기본 개념부터 천간·지지 음양 구분, 양팔통·음팔통 실전 해석까지.",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-900/50",
    items: [
      {
        slug: "yin-yang",
        title: "음양의 기본 개념 정리",
        description: "음양의 기본 원리부터 천간·지지 음양 구분, 양팔통·음팔통의 성향과 실전 활용법까지 정리했습니다.",
        date: "2026.01.14",
      },
    ],
  },
  {
    key: "five-elements",
    title: "오행",
    subtitle: "오행(五行)",
    description: "목·화·토·금·수의 특성과 상생·상극 흐름 정리.",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-900/50",
    items: [
      {
        slug: "five-elements",
        title: "오행의 기본 개념 정리",
        description: "오행 각각의 기운과 성질, 상생(相生)·상극(相剋)의 원리, 사주 해석에서의 활용 방법을 정리했습니다.",
        date: "2026.01.14",
      },
    ],
  },
  {
    key: "cheongan",
    title: "천간",
    subtitle: "천간(天干)",
    description: "갑을병정무기경신임계, 10천간의 성격과 해석 포인트.",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-900/50",
    items: [
      {
        slug: "cheongan",
        title: "천간의 기본 개념 정리",
        description: "10천간의 음양·오행 속성, 각 천간의 성격과 에너지, 사주에서 천간을 보는 방법을 정리했습니다.",
        date: "2026.01.14",
      },
    ],
  },
  {
    key: "jiji",
    title: "지지",
    subtitle: "지지(地支)",
    description: "자축인묘진사오미신유술해, 12지지의 성격과 해석 포인트.",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    borderClass: "border-violet-200 dark:border-violet-900/50",
    items: [
      {
        slug: "jiji",
        title: "지지의 기본 개념 정리",
        description: "12지지의 음양·오행·계절·방향 속성, 각 지지의 성질과 지장간 구성, 지지를 읽는 방법을 정리했습니다.",
        date: "2026.01.14",
      },
      {
        slug: "jijanggan",
        title: "지장간의 기본 개념 정리",
        description: "지지 속에 숨은 천간인 지장간의 구조와 여기·중기·정기의 의미, 12지지별 지장간 구성과 통근·격국 해석에서의 활용을 정리했습니다.",
        date: "2026.03.19",
      },
    ],
  },
  {
    key: "sipsin",
    title: "십신",
    subtitle: "십신(十神)",
    description: "비겁·식상·재성·관성·인성, 사주 해석의 핵심 프레임.",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
    borderClass: "border-cyan-200 dark:border-cyan-900/50",
    items: [
      {
        slug: "sipsin",
        title: "십신의 기본 개념 정리",
        description: "십신(비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인)의 의미와 특징, 실전 해석에서 십신을 보는 방법을 정리했습니다.",
        date: "2026.01.14",
      },
    ],
  },
  {
    key: "tonggeun-tuchul",
    title: "통근·투출",
    subtitle: "통근(通根) 및 투출(透出)",
    description: "뿌리가 있는가, 드러나 있는가 — 힘의 강약을 판단하는 핵심 개념.",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-900/50",
    items: [
      {
        slug: "tonggeun-and-tuchul",
        title: "통근 및 투출 기본 개념 정리",
        description: "천간이 지지에 뿌리를 내리는 통근(通根)과, 지장간이 천간에 드러나는 투출(透出)의 원리와 통근율 계산법을 정리했습니다.",
        date: "2026.01.15",
      },
    ],
  },
  {
    key: "hyeongchunghoihap",
    title: "형충회합",
    subtitle: "형충회합(刑冲會合)",
    description: "지지 간의 상호작용 — 형·충·회합·파·해·귀문·원진까지.",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-900/50",
    items: [
      {
        slug: "hyeong-chung-hoi-hap",
        title: "형충회합 기본 개념 정리",
        description: "지지가 서로 만날 때 일어나는 변화 — 형(刑)·충(冲)·회(會)·합(合)·파(破)·해(害)·귀문(鬼門)·원진(怨嗔)의 종류와 작용을 정리했습니다.",
        date: "2026.01.15",
      },
    ],
  },
  {
    key: "eight-letters",
    title: "자리의 의미",
    subtitle: "팔자(八字) 자리의 의미",
    description: "연·월·일·시주, 각 8자리가 가리키는 삶의 영역.",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    borderClass: "border-teal-200 dark:border-teal-900/50",
    items: [
      {
        slug: "eight-letters-meaning",
        title: "팔자 자리의 기본 개념 정리",
        description: "연주(조상·사회)·월주(부모·형제)·일주(나·배우자)·시주(자식·말년)로 대표되는 팔자 각 자리의 의미와 해석 관점을 정리했습니다.",
        date: "2026.01.15",
      },
    ],
  },
  {
    key: "terminology",
    title: "사주용어",
    subtitle: "사주 주요 용어 모음",
    description: "공부할 때 자주 마주치는 사주 용어들을 한데 모아 정리.",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-900/50",
    items: [
      {
        slug: "terminology",
        title: "사주용어 기본 개념 정리",
        description: "격국·용신·신강·신약·종격·화격 등 사주 공부에서 자주 등장하는 핵심 용어들을 한눈에 볼 수 있도록 정리했습니다.",
        date: "2026.01.27",
      },
    ],
  },
  {
    key: "ohang-mulssang",
    title: "오행 물상론",
    subtitle: "오행 물상론(五行 物象論)",
    description: "오행이 과다하거나 특정 조합을 이룰 때 나타나는 상호작용을 물상으로 풀어낸 용어들.",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-900/50",
    items: [
      {
        slug: "ohang-mulssang",
        title: "오행 물상론 용어",
        description: "오행 과다 용어(목다화식·화다목분 등)와 갑목·을목 병존부터 계수 병존까지 10천간 병존 물상 용어를 정리했습니다.",
        date: "2026.03.16",
      },
    ],
  },
  {
    key: "gyeokguk",
    title: "격국",
    subtitle: "격국(格局)",
    description: "내격과 외격, 화합·귀록·종격·전왕격까지 격국 구조를 한눈에 정리.",
    badgeClass: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300",
    borderClass: "border-fuchsia-200 dark:border-fuchsia-900/50",
    items: [
      {
        slug: "gyeokguk",
        title: "격국의 기본 개념 정리",
        description: "월지를 중심으로 잡는 내격과, 특수 구조를 따로 보는 외격을 나누어 대표 격국들을 정리했습니다.",
        date: "2026.03.17",
      },
    ],
  },
  {
    key: "saju-case",
    title: "사주사례집",
    subtitle: "주인장이 모은 사례집들",
    description: "실제 명식을 기반으로 원국 성격부터 운의 흐름까지 직접 풀어본 사례 모음.",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-900/50",
    items: [
      {
        slug: "saju-case-1",
        title: "주인장 사주 직접 해석해봤어요. — 경자일주 복음명식 자수삼존",
        description: "병자년 경자월 경자일 갑신시. 금수 강세에 복음명식·자수삼존까지 — 원국 성격부터 연애 시작, 혼인신고 타이밍까지 실제 명식을 직접 분석함.",
        date: "2026.03.19",
      },
    ],
  },
  {
    key: "saju-about-manseryeok",
    title: "만세력",
    subtitle: "만세력에 대해",
    description: "만세력 화면에 보이는 것들을 처음 보는 사람 기준으로 하나씩 정리.",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    borderClass: "border-yellow-200 dark:border-yellow-900/50",
    items: [
      {
        slug: "manseryeok",
        title: "만세력 보는 법",
        description: "사주팔자의 구조, 천간·지지·지장간, 십신·십이운성·신살, 대운·세운·월운, 형충회합까지 만세력 화면에 보이는 요소들을 초보자 기준으로 정리했습니다.",
        date: "2026.03.19",
      },
    ],
  },
  {
    key: "saju-misc-time",
    title: "균시차",
    subtitle: "태양 위치와 지역별 시간 보정",
    description: "태양의 위치, 경도 차이, 진태양시 보정처럼 실제 풀이에서 중요한 시간 보정 개념을 정리합니다.",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-900/50",
    items: [
      {
        slug: "solar-position-and-time-correction",
        title: "태양의 위치와 균시차의 중요성 (지역별 보정)",
        description: "사주에서 시간을 정하는 핵심 기준인 태양의 위치, 한국에서 +30분을 하는 이유, 지역별 진태양시 보정의 원리를 정리했습니다.",
        date: "2026.03.09",
      },
    ],
  },
  {
    key: "saju-misc-iljuron",
    title: "일주론",
    subtitle: "일주 해석의 한계와 활용",
    description: "일주론이 잘 맞는 경우와 빗나가는 경우를 나누어 보고, 어디까지 참고해야 하는지 정리합니다.",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-900/50",
    items: [
      {
        slug: "iljuron-why-not-always-correct",
        title: "일주론, 재미있지만 무조건 맞지는 않는 이유",
        description: "일주론이 잘 맞는 사람과 안 맞는 사람의 차이, 신약·중화·신강의 개념, 일주론을 올바르게 활용하는 방법을 정리했습니다.",
        date: "2026.03.09",
      },
    ],
  },
];

export const SAJU_NOTE_BY_SLUG = SAJU_NOTE_CATEGORIES.flatMap((category) => category.items).reduce<
  Record<string, SajuNoteItem>
>((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});
