// src/shared/lib/plan/planTier.ts
import type { PlanTier } from "@/shared/billing/entitlements";

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "").replace(/-/g, "_");
}

export function parsePlanTier(raw?: string | null): PlanTier {
  if (!raw) return "FREE";
  const v = normalize(raw);

  // ✅ 새 멤버십
  if (v === "free") return "FREE";
  if (v === "basic") return "BASIC";
  if (v === "pro") return "PRO";

  // ✅ 레거시(구 플랜들) -> 새 멤버십으로 매핑
  if (v === "prompt_hidden" || v === "prompt_hide" || v === "hidden" || v === "hide") return "FREE";
  if (v === "prompt_locked" || v === "prompt_lock" || v === "locked" || v === "lock") return "FREE";
  if (v === "prompt_full" || v === "full") return "PRO";

  if (v === "ms_all" || v === "msall") return "BASIC";

  if (v === "basic_3" || v === "basic3") return "BASIC";
  if (v === "basic_5" || v === "basic5") return "BASIC";
  if (v === "basic_10" || v === "basic10") return "BASIC";

  if (v === "pro_select" || v === "proselect") return "PRO";

  return "FREE";
}
