import type { MyeongSikRow, MyeongSikWithOrder } from "@/myeongsik/calc/myeongsikStore/types";

export type AuthedUser = { id: string };

export type RealtimeStatus = "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" | string;

export type RealtimePayload = {
  eventType?: string;
  new?: unknown;
  old?: unknown;
};

export interface RealtimeSubscription {
  unsubscribe(): Promise<void>;
}

export interface MyeongSikRepo {
  getUser(): Promise<AuthedUser | null>;

  fetchRows(userId: string): Promise<MyeongSikRow[]>;

  upsertOne(userId: string, item: MyeongSikWithOrder): Promise<void>;

  updateOne(userId: string, id: string, item: MyeongSikWithOrder): Promise<void>;

  softDelete(id: string): Promise<void>;

  upsertOrderPatch(userId: string, list: MyeongSikWithOrder[]): Promise<void>;

  subscribe(userId: string, onPayload: (payload: RealtimePayload) => void, onStatus?: (s: RealtimeStatus) => void): Promise<RealtimeSubscription>;
}
