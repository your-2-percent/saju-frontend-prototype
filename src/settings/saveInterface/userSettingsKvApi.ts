import { supabase } from "@/lib/supabase";

export type UserSettingKey = string;

type UserSettingsKvRow = {
  user_id: string;
  setting_key: string;
  value: unknown;
  updated_at: string | null;
};

export async function fetchUserSettingKv<T>(
  userId: string,
  settingKey: UserSettingKey,
): Promise<T | null> {
  const { data, error } = await supabase
    .from("user_settings_kv")
    .select("value")
    .eq("user_id", userId)
    .eq("setting_key", settingKey)
    .maybeSingle<UserSettingsKvRow>();

  if (error) throw error;
  return (data?.value as T | undefined) ?? null;
}

export async function upsertUserSettingKv(
  userId: string,
  settingKey: UserSettingKey,
  value: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("user_settings_kv")
    .upsert(
      {
        user_id: userId,
        setting_key: settingKey,
        value,
      },
      { onConflict: "user_id,setting_key" },
    );

  if (error) throw error;
}

export async function fetchAllUserSettingsKv(
  userId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("user_settings_kv")
    .select("setting_key,value")
    .eq("user_id", userId)
    .returns<Pick<UserSettingsKvRow, "setting_key" | "value">[]>();

  if (error) throw error;

  const out: Record<string, unknown> = {};
  for (const row of data ?? []) {
    out[row.setting_key] = row.value;
  }
  return out;
}
