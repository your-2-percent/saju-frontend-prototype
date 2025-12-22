import type { PlanTier } from "@/shared/billing/entitlements";
import { getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";
import { parsePlanTier } from "@/shared/lib/plan/planTier";
import type { EntRow, PlanOption, PlanPreset } from "../model/types";

export const PLAN_OPTIONS: PlanOption[] = [
  { value: "PROMPT_HIDDEN", label: "프롬프트 숨김" },
  { value: "PROMPT_LOCKED", label: "프롬프트 표시(잠금)" },
  { value: "PROMPT_FULL", label: "프롬프트 사용 가능" },
];

export function isPlanTier(v: unknown): v is PlanTier {
  return v === "PROMPT_HIDDEN" || v === "PROMPT_LOCKED" || v === "PROMPT_FULL";
}

export function coercePlanTier(v: unknown): PlanTier | null {
  if (typeof v !== "string") return null;
  return parsePlanTier(v);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toYMDInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  return `${y}-${m}-${da}`;
}

export function toKstIsoFromDateInput(dateStr: string, endOfDay: boolean): string | null {
  const raw = (dateStr ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return endOfDay ? `${raw}T23:59:59+09:00` : `${raw}T00:00:00+09:00`;
}

export function getPreset(plan: PlanTier): PlanPreset {
  const caps = getPlanCapabilities(plan);
  const max = caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik;
  return {
    plan,
    max_myeongsik: max,
    can_manage_myeongsik: caps.canManageMyeongsik,
    can_use_luck_tabs: caps.canUseLuckTabs,
    can_use_multi_mode: caps.canUseMultiMode,
    can_use_all_prompts: caps.canUseAllPrompts,
  };
}

export function planLabel(p: PlanTier | null | undefined): string {
  const v = p ?? "PROMPT_LOCKED";
  return PLAN_OPTIONS.find((x) => x.value === v)?.label ?? String(v);
}

export function periodLabel(ent: EntRow | null): string {
  const s = ent?.starts_at ? toYMDInput(ent.starts_at) : "";
  const e = ent?.expires_at ? toYMDInput(ent.expires_at) : "";
  if (!s && !e) return "기간 미설정";
  if (s && !e) return `${s} ~ (무기한)`;
  if (!s && e) return `(시작일 없음) ~ ${e}`;
  return `${s} ~ ${e}`;
}
