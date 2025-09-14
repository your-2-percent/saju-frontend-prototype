export type BirthPlace = {
  name: string;
  lat: number;
  lon: number;
};

// storage/storage.ts (추가/확장)
export type MyeongSik = {
  id: string;
  name: string;
  birthDay: string;   // YYYY-MM-DD
  birthTime: string;  // HH:MM
  gender: string;
  birthPlace?: { name: string; lat: number; lon: number };
  relationship?: string;
  memo?: string;
  folder?: string;
  mingSikType: "야자시" | "조자시" | "인시";
  DayChangeRule: "자시일수론" | "인시일수론";
  favorite?: boolean;

  // 계산/보정 필드
  dateObj: Date;          // 원본 Date 객체
  corrected: Date;        // 보정된 Date
  correctedLocal: string; // 보정시 "HH:MM"
  // 간지 관련
  dayStem: string;        // 일간
  ganjiText: string;      // 간지 전체 문자열
  ganji: string;          // (호환용) 간지 전체 문자열
  calendarType: "solar" | "lunar";
  dir: "forward" | "backward";
};

// 폼 입력 상태용
export type FormState = {
  name: string;
  birthDay: string;
  birthTime: string;
  gender: "남자" | "여자";
  birthPlace?: BirthPlace;
  relationship: string;
  memo: string;
};

export interface StorageMyeongSik {
  id: string;
  name: string;
  birthDay: string;       // YYYYMMDD
  birthTime: string;      // HHmm
  birthPlace: string;     // 장소 이름
  relationship?: string;  // (옵션) 관계
  memo?: string;          // (옵션) 메모
}

export function makeEmptyMyeongSik(): MyeongSik {
  return {
    id: "tmp-" + Date.now(), // 임시 id
    name: "",
    birthDay: "",
    birthTime: "",
    gender: "",
    birthPlace: { name: "", lat: 0, lon: 0 },
    relationship: "",
    memo: "",
    folder: "미분류",
    mingSikType: "야자시",
    DayChangeRule: "자시일수론",
    favorite: false,

    // 선택 필드
    corrected: new Date(),
    correctedLocal: "",
    ganjiText: "",
    ganji: "",
    dir: "forward",

    dateObj: new Date(),
    dayStem: "갑",
    calendarType: "solar",
  };
}