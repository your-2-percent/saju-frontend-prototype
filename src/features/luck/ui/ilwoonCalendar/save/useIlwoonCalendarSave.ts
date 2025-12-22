import { useCallback } from "react";
import type { LuckScope } from "@/shared/lib/hooks/useLuckPickerStore";

type UseIlwoonCalendarSaveArgs = {
  setFromEvent: (payload: { at: Date; gz?: string }, scope: LuckScope) => void;
};

type IlwoonCalendarSave = {
  handleDayClick: (dayLocal: Date) => void;
};

export function useIlwoonCalendarSave({ setFromEvent }: UseIlwoonCalendarSaveArgs): IlwoonCalendarSave {
  const handleDayClick = useCallback(
    (dayLocal: Date) => {
      setFromEvent({ at: dayLocal }, "일운");
    },
    [setFromEvent]
  );

  return { handleDayClick };
}
