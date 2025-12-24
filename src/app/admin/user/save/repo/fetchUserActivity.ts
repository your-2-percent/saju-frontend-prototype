import { supabase } from "@/lib/supabase";

export type UserActivityRow = {
  user_id: string;
  last_seen_at: string | null;
  last_path: string | null;
  total_active_ms: number | null;
};

export async function fetchUserActivity(userIds: string[]): Promise<UserActivityRow[]> {
  if (!userIds.length) return [];

  const { data, error } = await supabase
    .from("user_activity")
    .select("user_id,last_seen_at,last_path,total_active_ms")
    .in("user_id", userIds);

  if (error) throw error;
  return (data ?? []) as UserActivityRow[];
}
