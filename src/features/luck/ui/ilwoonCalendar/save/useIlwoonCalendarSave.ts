import { useCallback } from "react";

type UseIlwoonCalendarSaveArgs = {
  setFromEvent: (payload: { at: Date }, label?: string) => void;
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
