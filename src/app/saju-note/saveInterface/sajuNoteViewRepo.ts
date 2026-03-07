import { supabase } from "@/lib/supabase";

type CountRow = {
  slug?: string | null;
  view_count?: number | string | null;
};

function toCount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }
  return null;
}

export async function incrementSajuNoteView(slug: string): Promise<number | null> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const { data, error } = await supabase.rpc("increment_saju_note_view", {
    p_slug: cleanSlug,
  });
  if (error) {
    console.warn("[saju-note] increment_saju_note_view rpc failed:", error.message ?? error);
    return null;
  }

  // bigint scalar return
  const scalar = toCount(data);
  if (scalar != null) return scalar;

  // table/object return fallback
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0] as CountRow;
    return toCount(row?.view_count);
  }
  if (typeof data === "object" && data !== null) {
    const row = data as CountRow;
    return toCount(row.view_count);
  }

  return null;
}

export async function fetchSajuNoteViewCounts(slugs: string[]): Promise<Record<string, number>> {
  const cleanSlugs = Array.from(new Set(slugs.map((s) => s.trim()).filter((s) => s.length > 0)));
  if (!cleanSlugs.length) return {};

  const { data, error } = await supabase.rpc("get_saju_note_view_counts", {
    p_slugs: cleanSlugs,
  });
  if (error) {
    console.warn("[saju-note] get_saju_note_view_counts rpc failed:", error.message ?? error);
    return {};
  }

  if (!Array.isArray(data)) return {};

  const out: Record<string, number> = {};
  for (const raw of data as CountRow[]) {
    const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
    if (!slug) continue;
    out[slug] = toCount(raw.view_count) ?? 0;
  }
  return out;
}

