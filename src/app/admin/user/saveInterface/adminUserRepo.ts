import { supabase } from "@/lib/supabase";
import type { EntRowRaw, MyeongsikRow, ProfileRow } from "../model/types";

export async function fetchUserIds(search: string): Promise<string[]> {
  const raw = search.trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
  const term = `%${raw}%`;

  const out = new Set<string>();

  // 1) 기본 목록: profiles + user_entitlements 기반 (명식 0개도 포함)
  if (!raw) {
    const [pRes, eRes] = await Promise.all([
      supabase.from("profiles").select("user_id").limit(1000),
      supabase.from("user_entitlements").select("user_id").limit(1000),
    ]);

    if (pRes.error) throw new Error(pRes.error.message);
    if (eRes.error) throw new Error(eRes.error.message);

    (pRes.data ?? []).forEach((r) => r.user_id && out.add(r.user_id));
    (eRes.data ?? []).forEach((r) => r.user_id && out.add(r.user_id));

    return Array.from(out);
  }

  // 2) 검색: profiles에서 name/nickname/email + (uuid면 user_id eq)
  {
    let q = supabase.from("profiles").select("user_id").limit(1000);

    if (isUuid) {
      q = q.eq("user_id", raw);
    } else {
      q = q.or(`name.ilike.${term},nickname.ilike.${term},email.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    (data ?? []).forEach((r) => r.user_id && out.add(r.user_id));
  }

  // 3) 검색: entitlements에서도 uuid면 잡히게(혹시 profiles 누락 대비)
  {
    let q = supabase.from("user_entitlements").select("user_id").limit(1000);
    if (isUuid) q = q.eq("user_id", raw);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    (data ?? []).forEach((r) => r.user_id && out.add(r.user_id));
  }

  // 4) 검색: myeongsik에서도 name/birthDay로 잡히게(명식 검색 유지)
  {
    let q = supabase.from("myeongsik").select("user_id").limit(1000);

    if (isUuid) {
      q = q.eq("user_id", raw);
    } else {
      q = q.or(`name.ilike.${term},birth_json->>birthDay.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    (data ?? []).forEach((r) => r.user_id && out.add(r.user_id));
  }

  return Array.from(out);
}


export async function fetchProfiles(userIds: string[]): Promise<ProfileRow[]> {
  const { data, error } = (await supabase
    .from("profiles")
    .select("id,user_id,name,nickname,email")
    .in("user_id", userIds)) as unknown as {
      data: ProfileRow[] | null;
      error: { message: string } | null;
    };

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchMyeongsikRows(userIds: string[]): Promise<MyeongsikRow[]> {
  const { data, error } = (await supabase
    .from("myeongsik")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })) as unknown as {
      data: MyeongsikRow[] | null;
      error: { message: string } | null;
    };

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchEntitlements(userIds: string[]): Promise<EntRowRaw[]> {
  const { data, error } = (await supabase
    .from("user_entitlements")
    .select("user_id,plan,starts_at,expires_at,can_use_myo_viewer")
    .in("user_id", userIds)) as unknown as {
      data: EntRowRaw[] | null;
      error: { message: string } | null;
    };

  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertEntitlements(payload: {
  user_id: string;
  plan: string;
  max_myeongsik: number;
  starts_at: string | null;
  expires_at: string | null;
  can_use_myo_viewer: boolean;
}) {
  const { error } = await supabase
    .from("user_entitlements")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}
