import { supabase } from "@/lib/supabase";

type FolderOrderRow = { folder_name: string | null };

type CustomFolderRow = { folder_name: string | null };

type ServerResult<T> = {
  data: T;
  error: unknown | null;
  disabled?: boolean;
};

export const getUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
};

export const fetchCustomFolders = async (
  userId: string
): Promise<ServerResult<string[]>> => {
  const { data, error } = await supabase
    .from("user_custom_folders")
    .select("folder_name")
    .eq("user_id", userId);

  if (error && (error as { code?: string }).code === "PGRST205") {
    return { data: [], error, disabled: true };
  }

  if (error) {
    return { data: [], error };
  }

  const rows = (data ?? []) as CustomFolderRow[];
  const names = rows
    .map((row) => (row.folder_name ? row.folder_name.trim() : ""))
    .filter((v) => v !== "");

  return { data: names, error: null };
};

export const fetchFolderOrder = async (
  userId: string
): Promise<ServerResult<string[]>> => {
  const { data, error } = await supabase
    .from("user_folder_order")
    .select("folder_name, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: true });

  if (error) {
    return { data: [], error };
  }

  const rows = (data ?? []) as FolderOrderRow[];
  const order = rows
    .map((row) => (row.folder_name ? String(row.folder_name) : ""))
    .filter((v) => v.trim() !== "");

  return { data: order, error: null };
};

export const saveFolderOrderToServer = async (
  userId: string,
  order: string[]
): Promise<ServerResult<null>> => {
  const rows = order
    .filter((name) => typeof name === "string" && name.trim() !== "")
    .map((name, idx) => ({
      user_id: userId,
      folder_name: name.trim(),
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) {
    const { error } = await supabase
      .from("user_folder_order")
      .delete()
      .eq("user_id", userId);
    return { data: null, error };
  }

  const { error } = await supabase
    .from("user_folder_order")
    .upsert(rows, { onConflict: "user_id,folder_name" });

  return { data: null, error };
};

export const deleteFolderOrderEntry = async (
  userId: string,
  folderName: string
): Promise<ServerResult<null>> => {
  const { error } = await supabase
    .from("user_folder_order")
    .delete()
    .eq("user_id", userId)
    .eq("folder_name", folderName);

  return { data: null, error };
};

export const saveCustomFolderToServer = async (
  userId: string,
  name: string
): Promise<ServerResult<null>> => {
  const { error } = await supabase.from("user_custom_folders").upsert({
    user_id: userId,
    folder_name: name,
    updated_at: new Date().toISOString(),
  });

  if (error && (error as { code?: string }).code === "PGRST205") {
    return { data: null, error, disabled: true };
  }

  return { data: null, error };
};

export const deleteCustomFolderFromServer = async (
  userId: string,
  name: string
): Promise<ServerResult<null>> => {
  const { error } = await supabase
    .from("user_custom_folders")
    .delete()
    .eq("user_id", userId)
    .eq("folder_name", name);

  if (error && (error as { code?: string }).code === "PGRST205") {
    return { data: null, error, disabled: true };
  }

  return { data: null, error };
};
