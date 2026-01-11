import { supabase } from "@/lib/supabase";
import { buildRowForOrderPatch, buildRowForUpsert, normalizeRowLoose } from "@/myeongsik/calc/myeongsikStore/mappers";
import type { MyeongSikWithOrder } from "@/myeongsik/calc/myeongsikStore/types";
import type { MyeongSikRepo, RealtimePayload, RealtimeStatus, RealtimeSubscription } from "@/myeongsik/saveInterface/ports";

async function safeRemoveRealtimeChannel(channel: unknown): Promise<void> {
  if (!channel) return;

  const client = supabase as unknown as {
    removeChannel?: (ch: unknown) => Promise<unknown>;
    removeSubscription?: (ch: unknown) => Promise<unknown>;
  };

  if (typeof client.removeChannel === "function") {
    await client.removeChannel(channel);
    return;
  }
  if (typeof client.removeSubscription === "function") {
    await client.removeSubscription(channel);
    return;
  }
}

function getBaseSelect(): string {
  return [
    "id",
    "user_id",
    "name",
    "birth_day",
    "birth_time",
    "gender",
    "birth_place_name",
    "birth_place_lat",
    "birth_place_lon",
    "relationship",
    "memo",
    "folder",
    "ming_sik_type",
    "day_change_rule",
    "calendar_type",
    "favorite",
    "deleted_at",
    "created_at",
    "updated_at",
    "sort_order",
  ].join(", ");
}

export function makeSupabaseMyeongSikRepo(): MyeongSikRepo {
  return {
    async getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id };
    },

    async fetchRows(userId: string) {
      const { data, error } = await supabase
        .from("myeongsik")
        .select(getBaseSelect())
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      const list = Array.isArray(data) ? data : [];
      return list
        .map((row) => normalizeRowLoose(row))
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .filter((row) => row.user_id === userId);
    },

    async upsertOne(userId: string, item: MyeongSikWithOrder) {
      const row = buildRowForUpsert(item, userId);
      const { error } = await supabase.from("myeongsik").upsert(row, { onConflict: "id" });
      if (error) console.error("myeongsik upsert error:", error);
    },

    async updateOne(userId: string, id: string, item: MyeongSikWithOrder) {
      const row = buildRowForUpsert(item, userId);
      const { error } = await supabase.from("myeongsik").update(row).eq("id", id);
      if (error) console.error("myeongsik update error:", error);
    },

    async softDelete(id: string) {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase.from("myeongsik").update({ deleted_at: deletedAt }).eq("id", id);
      if (error) console.error("myeongsik softDelete error:", error);
    },

    async upsertOrderPatch(userId: string, list: MyeongSikWithOrder[]) {
      const rows = list.map((m) => buildRowForOrderPatch(m, userId));
      const { error } = await supabase.from("myeongsik").upsert(rows, { onConflict: "id" });
      if (error) console.error("myeongsik orderPatch upsert error:", error);
    },

    async subscribe(userId: string, onPayload: (payload: RealtimePayload) => void, onStatus?: (s: RealtimeStatus) => void) {
      const channel = supabase
        .channel(`myeongsik:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "myeongsik",
            filter: `user_id=eq.${userId}`,
          },
          (payload: unknown) => {
            if (typeof payload !== "object" || payload === null) return;
            onPayload(payload as RealtimePayload);
          }
        )
        .subscribe((status: unknown) => {
          if (onStatus) onStatus(String(status));
        });

      const subscription: RealtimeSubscription = {
        async unsubscribe() {
          await safeRemoveRealtimeChannel(channel);
        },
      };

      return subscription;
    },
  };
}
