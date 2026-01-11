import { fromRow, normalizeRowLoose, sortByOrder } from "@/myeongsik/calc/myeongsikStore/mappers";
import type { RealtimePayload } from "@/myeongsik/saveInterface/ports";
import type { MyeongSikWithOrder } from "@/myeongsik/calc/myeongsikStore/types";

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
