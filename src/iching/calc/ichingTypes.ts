export type LineValue = 6 | 7 | 8 | 9; // 6: 노음(변), 7: 소양, 8: 소음, 9: 노양(변)
export type YinYang = 0 | 1; // 0=음(끊김), 1=양(이어짐)

export type Coin = 2 | 3; // 2=뒷면, 3=앞면
export type LineSource = "coin" | "manual";

export type LineDraw = {
  value: LineValue;
  source: LineSource;
  coins?: readonly [Coin, Coin, Coin];
};

export type SajuContext = {
  myeongSikId?: string;
  name?: string;
  gender?: string;

  pillarsText?: string;
  pillars?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };

  luck?: {
    daeun?: string;
    seun?: string;
    wolun?: string;
    ilun?: string;
  };

  birthISO?: string;
  tz?: string;
  memo?: string;
};

export type DivinationRecord = {
  id: string;
  kind: "iching_sixyao";
  createdAtISO: string;

  question: string;
  seedTextUsed: string;

  linesBottomUp: LineDraw[];
  changingLines: number[];
  baseBitsBottomUp: YinYang[];
  changedBitsBottomUp: YinYang[];

  saju?: SajuContext;
  viewMeta?: Record<string, unknown>;
};
