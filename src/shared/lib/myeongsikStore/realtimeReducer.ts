import { fromRow, normalizeRowLoose, sortByOrder } from "@/shared/lib/myeongsikStore/mappers";
import type { RealtimePayload } from "@/shared/lib/myeongsikStore/repo/ports";
import type { MyeongSikWithOrder } from "@/shared/lib/myeongsikStore/types";

export function reduceListByRealtime(prev: MyeongSikWithOrder[], payload: RealtimePayload): MyeongSikWithOrder[] {
  const eventType = String(payload.eventType ?? "");
  const newRow = normalizeRowLoose(payload.new);
  const oldRow = normalizeRowLoose(payload.old);

  const row = newRow ?? oldRow;
  if (!row) return prev;

  if (eventType === "DELETE" || row.deleted_at) {
    return prev.filter((m) => m.id !== row.id);
  }

  const item = fromRow(row);
  const existed = prev.some((m) => m.id === item.id);
  const next = existed ? prev.map((m) => (m.id === item.id ? item : m)) : [...prev, item];
  return sortByOrder(next);
}
