export function formatDate24(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ` +
         `${pad(d.getHours())}시 ${pad(d.getMinutes())}분`;
  // ${pad(d.getSeconds())}초
}

// shared/utils/time.ts
export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatLocalHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatLocalYMDHM(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
