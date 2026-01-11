import type { Element } from "../utils/types";
import { SHENG_NEXT, SHENG_PREV, KE, KE_REV } from "../powerDataPrimitives";
import { ELEMENTS, MONTH_BRANCH_CLIMATE, ZERO_ELEMENT_SCORE } from "./tables";
import type { BasisBand, ElementScore, ReasonsMap } from "./types";

export function scoreEokbu(
  dEl: Element,
  band: BasisBand,
  reasons: ReasonsMap
): ElementScore {
  const strongSide = ["중화신강", "태강", "극태강"].includes(band);
  const weakSide   = ["극약", "태약", "신약", "중화신약"].includes(band);
  const base: ElementScore = { ...ZERO_ELEMENT_SCORE };

  if (strongSide) {
    const leak = SHENG_NEXT[dEl], wealth = KE[dEl], officer = KE_REV[dEl];
    base[leak] += 28; base[wealth] += 22; base[officer] += 20;
    reasons.get(leak)?.push("억부: 일간 강 → 설기(식상)");
    reasons.get(wealth)?.push("억부: 일간 강 → 재성 누설");
    reasons.get(officer)?.push("억부: 일간 강 → 관성 절제");
  }
  if (weakSide) {
    const resource = SHENG_PREV[dEl], peer = dEl;
    base[resource] += 28; base[peer] += 22;
    reasons.get(resource)?.push("억부: 일간 약 → 인성 보강");
    reasons.get(peer)?.push("억부: 일간 약 → 비겁 보강");
  }
  return base;
}

export function scoreChoHu(mb: string | null, reasons: ReasonsMap): ElementScore {
  if (!mb) return { ...ZERO_ELEMENT_SCORE };
  const cli = MONTH_BRANCH_CLIMATE[mb] ?? { temp: "mild", wet: "normal" };
  const s: ElementScore = { ...ZERO_ELEMENT_SCORE };
  if (cli.temp === "cold") {
    s["화"] += 16; s["토"] += 6;
    reasons.get("화")?.push("조후: 한랭 → 화");
    reasons.get("토")?.push("조후: 한랭습 보조");
  } else if (cli.temp === "hot") {
    s["수"] += 14; s["금"] += 6;
    reasons.get("수")?.push("조후: 염열 → 수");
    reasons.get("금")?.push("조후: 제열 보조");
  }
  if (cli.wet === "wet") {
    s["토"] += 8; s["화"] += 4;
    reasons.get("토")?.push("조후: 습 → 토");
    reasons.get("화")?.push("조후: 습냉 가온");
  } else if (cli.wet === "dry") {
    s["수"] += 8; s["목"] += 4;
    reasons.get("수")?.push("조후: 건조 → 수");
    reasons.get("목")?.push("조후: 생발 보조");
  }
  return s;
}

export function scoreTongGwan(elemScore: ElementScore, reasons: ReasonsMap): ElementScore {
  const s: ElementScore = { ...ZERO_ELEMENT_SCORE };
  for (const a of ELEMENTS) {
    const b = KE[a];
    const pressure = Math.max(0, (elemScore[a] ?? 0) - (elemScore[b] ?? 0));
    if (pressure <= 0) continue;
    const mediator = SHENG_NEXT[a];
    const gain = Math.round(pressure * 0.35);
    if (gain > 0) {
      s[mediator] += gain;
      reasons.get(mediator)?.push(`통관: ${a}극${b} 완화`);
    }
  }
  return s;
}

export function scoreByeongYak(elemScore: ElementScore, reasons: ReasonsMap): ElementScore {
  const s: ElementScore = { ...ZERO_ELEMENT_SCORE };
  const entries = Object.entries(elemScore) as Array<[Element, number]>;
  const minVal = Math.min(...entries.map(([, v]) => v));
  const nearZero = entries.filter(([, v]) => v <= Math.max(6, minVal));
  for (const [el] of nearZero) {
    s[el] += 12;
    reasons.get(el)?.push("병약: 결핍 보충");
  }
  return s;
}
