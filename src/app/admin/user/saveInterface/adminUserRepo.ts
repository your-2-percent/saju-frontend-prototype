import { supabase } from "@/lib/supabase";
import type { EntRowRaw, MyeongsikRow, ProfileRow } from "../model/types";

export async function fetchUserIds(search: string): Promise<string[]> {
  let query = supabase.from("myeongsik").select("user_id,name");

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${term},user_id.ilike.${term},birth_json->>birthDay.ilike.${term}`
    );
  }

  const { data, error } = (await query) as unknown as {
    data: { user_id: string }[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);

  return Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean)));
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
    .select("user_id,plan,starts_at,expires_at")
    .in("user_id", userIds)) as unknown as {
      data: EntRowRaw[] | null;
      error: { message: string } | null;
    };

  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertEntitlements(payload: Record<string, unknown>) {
  const { error } = await supabase.from("user_entitlements").upsert(payload);
  if (error) throw new Error(error.message);
}
