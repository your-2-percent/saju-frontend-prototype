import type { PlanTier } from "@/shared/billing/entitlements";

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "").replace(/-/g, "_");
}

export function parsePlanTier(raw?: string | null): PlanTier {
  if (!raw) return "PROMPT_LOCKED";
  const v = normalize(raw);

  if (v === "prompt_hidden" || v === "prompt_hide" || v === "hidden" || v === "hide") {
    return "PROMPT_HIDDEN";
  }

  if (v === "prompt_locked" || v === "prompt_lock" || v === "locked" || v === "lock") {
    return "PROMPT_LOCKED";
  }

  if (v === "prompt_full" || v === "full") {
    return "PROMPT_FULL";
  }

  // Legacy tiers (default to locked)
  if (v === "free") return "PROMPT_LOCKED";
  if (v === "ms_all" || v === "msall") return "PROMPT_LOCKED";
  if (v === "pro" || v === "pro_select" || v === "proselect") return "PROMPT_LOCKED";
  if (v === "basic_3" || v === "basic3") return "PROMPT_LOCKED";
  if (v === "basic_5" || v === "basic5") return "PROMPT_LOCKED";
  if (v === "basic_10" || v === "basic10") return "PROMPT_LOCKED";

  return "PROMPT_LOCKED";
}
