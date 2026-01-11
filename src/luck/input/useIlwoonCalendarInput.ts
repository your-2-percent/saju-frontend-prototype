import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
type LuckPickerState = ReturnType<typeof useLuckPickerStore.getState>;

type IlwoonCalendarInput = {
  settings: SettingsState["settings"];
  pickedDate: LuckPickerState["date"];
  setFromEvent: LuckPickerState["setFromEvent"];
};

export function useIlwoonCalendarInput(): IlwoonCalendarInput {
  const settings = useSettingsStore((s) => s.settings);
  const { date, setFromEvent } = useLuckPickerStore();

  return {
    settings,
    pickedDate: date,
    setFromEvent,
  };
}
