// 명식 정보만 복사용 텍스트 추출

export function extractMyeongSikInfoOnly(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";

  // "해석 지시문" 영역 이전까지만 추출
  const markers: RegExp[] = [
    /\r?\n-----\s*\r?\n/,
    /\r?\n?§\s*해석\s*가이드/,
    /\r?\n?¤\s*질문\s*체크/,
    /\r?\n##\s*시간\s*모드/,
    /\r?\n##\s*카테고리/,
    /\r?\n?###\s*기본형/,
    /\r?\n?【\s*필수\s*해석요소/,
    /\r?\n?【\s*출력\s*규칙/,
  ];

  let cut = -1;
  for (const re of markers) {
    const idx = text.search(re);
    if (idx >= 0) cut = cut < 0 ? idx : Math.min(cut, idx);
  }

  return cut >= 0 ? text.slice(0, cut).trimEnd() : text;
}
