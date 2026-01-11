// features/AnalysisReport/logic/gyeokguk/formatter.ts
import type { TenGodSubtype } from "./types";

export type SaryeongPickFrom = "초기" | "중기" | "정기";

export type ReasonToken =
  | { kind: "WANGJI_FIXED_JUNGI" }
  | { kind: "BUNIL_PICK"; from: SaryeongPickFrom }
  | { kind: "BUNIL_FALLBACK_USE_WOLRYEONG" }
  | { kind: "DANRYEONG_CONFIRMED_BY_EMIT" }
  | { kind: "SAENGJI_EMITTED_ONE"; from: SaryeongPickFrom }
  | { kind: "SAENGJI_EMITTED_MULTI"; from: SaryeongPickFrom }
  | { kind: "SAENGJI_NOT_EMITTED_USE_JUNGI" }
  | { kind: "GOJI_SAMHAP_USE_JUNGI" }
  | { kind: "GOJI_EARLY_JEOLIP_USE_CHOGI" }
  | { kind: "GOJI_LATE_JEOLIP_USE_JUNGI" }
  | { kind: "NEUTRALIZED" }
  | { kind: "EX_GEONLOK" }
  | { kind: "EX_YANGIN" }
  | { kind: "EX_WOLGEOP" }
  | { kind: "EX_EXCLUDED_BIGEOP" };

export function formatReasons(tokens: ReasonToken[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    switch (t.kind) {
       case "BUNIL_PICK":
        out.push(`분일: ${t.from} 채택`);
      break;
      case "WANGJI_FIXED_JUNGI":
        out.push("왕지: 정기 그대로 채택");
        break;
      case "SAENGJI_EMITTED_ONE":
        out.push(`생지: ${t.from} 투출 채택`);
        break;
      case "SAENGJI_EMITTED_MULTI":
        out.push(`생지: 동시 투출 → 가중치 큰 ${t.from} 채택`);
        break;
      case "SAENGJI_NOT_EMITTED_USE_JUNGI":
        out.push("생지: 미투출 → 정기 채택");
        break;
      case "GOJI_SAMHAP_USE_JUNGI":
        out.push("고지: 삼합 성립 → 중기 채택");
        break;
      case "GOJI_EARLY_JEOLIP_USE_CHOGI":
        out.push("고지: 절입 +12일 이내 → 여기 채택");
        break;
      case "GOJI_LATE_JEOLIP_USE_JUNGI":
        out.push("고지: 절입 +12일 이후 → 정기 채택");
        break;
      case "NEUTRALIZED":
        out.push("예외: 격 후보가 합/충으로 무력화");
        break;
      case "EX_GEONLOK":
        out.push("예외: 비견/겁재지만 건록팔자 → 건록격");
        break;
      case "EX_YANGIN":
        out.push("예외: 비견이지만 양인격 조건 충족");
        break;
      case "EX_WOLGEOP":
        out.push("예외: 겁재지만 월지겁재격 조건 충족");
        break;
      case "EX_EXCLUDED_BIGEOP":
        out.push("예외: 비견/겁재는 내격에서 제외됨");
        break;
    }
  }
  return out;
}

export function formatNaegyeokLabel(sub: TenGodSubtype): string {
  if (sub === "편관") return "편관격(칠살격)";
  const nameMap: Record<string, string> = {
    식신: "식신격", 상관: "상관격",
    정재: "정재격", 편재: "편재격",
    정관: "정관격", 편관: "편관격",
    정인: "정인격", 편인: "편인격",
  };
  return nameMap[sub] ?? "-";
}
