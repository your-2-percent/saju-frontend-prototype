export interface MyeongSik {
  id?: string;
  user_id?: string;
  name: string;
  birth: {
    year: number;
    month: number;
    day: number;
    time: string;
    calendarType: "solar" | "lunar";
  };
  raw: unknown; // 네가 쓰는 원본 구조 그대로 저장해도 됨
  created_at?: string;
}