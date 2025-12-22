import { addCalendarYears } from "@/features/myoun/calc/time";
import { buildWolju } from "@/features/myoun/calc/wolju";

export const logWolju120 = (wolju: ReturnType<typeof buildWolju>) => {
  const rows = wolju.events.map((e, i) => ({
    idx: i + 1,
    start: e.at.toLocaleString(),
    end: addCalendarYears(e.at, 10).toLocaleString(),
    wolju: e.gz,
  }));
  console.table(rows);
};
