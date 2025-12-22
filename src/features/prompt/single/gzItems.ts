// features/prompt/single/gzItems.ts

import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import type { JuLabel } from "../promptPosLabels";

export type GzItemKind = "natal" | "luck";

export type GzItem = {
  kind: GzItemKind;
  pos: string;
  gz: string;
};

/**
 * 단일 탭에서 쓰는 (원국 + 운...) 간지 아이템 리스트
 * - tab===원국: 원국만
 * - tab!==원국: 원국 + (대운/세운/월운/일운) 필요한 것만
 */
export function buildSingleGzItems(args: {
  tab: BlendTab;
  natal: Pillars4;
  posLabels: readonly JuLabel[];
  chain?: LuckChain;
}): GzItem[] {
  const { tab, natal, posLabels, chain } = args;

  const base: GzItem[] = [];
  for (let i = 0; i < posLabels.length; i++) {
    const gz = natal[i] ?? "";
    if (!gz) continue;
    base.push({ kind: "natal", pos: posLabels[i], gz });
  }

  if (tab === "원국") return base;
  if (!chain) return base;

  const out = [...base];

  if (chain.dae) out.push({ kind: "luck", pos: "대운", gz: chain.dae });
  if ((tab === "세운" || tab === "월운" || tab === "일운") && chain.se) {
    out.push({ kind: "luck", pos: "세운", gz: chain.se });
  }
  if ((tab === "월운" || tab === "일운") && chain.wol) {
    out.push({ kind: "luck", pos: "월운", gz: chain.wol });
  }
  if (tab === "일운" && chain.il) {
    out.push({ kind: "luck", pos: "일운", gz: chain.il });
  }

  return out;
}

/**
 * 헤더에 들어갈 운 라벨 문자열
 */
export function formatSingleLuckChain(tab: BlendTab, chain?: LuckChain): string {
  if (!chain) return "(없음)";

  const parts: string[] = [];

  if (tab === "대운" || tab === "세운" || tab === "월운" || tab === "일운") {
    if (chain.dae) parts.push(`대운:${normalizeGZ(chain.dae)}`);
  }
  if (tab === "세운" || tab === "월운" || tab === "일운") {
    if (chain.se) parts.push(`세운:${normalizeGZ(chain.se)}`);
  }
  if (tab === "월운" || tab === "일운") {
    if (chain.wol) parts.push(`월운:${normalizeGZ(chain.wol)}`);
  }
  if (tab === "일운") {
    if (chain.il) parts.push(`일운:${normalizeGZ(chain.il)}`);
  }

  return parts.length > 0 ? parts.join(" / ") : "(없음)";
}
