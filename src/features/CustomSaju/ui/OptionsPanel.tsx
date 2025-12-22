import type { HourRule } from "../input/customSajuTypes";

export function OptionsPanel({
  useWoldu,
  useSiju,
  hourRule,
  gender,
  onToggleWoldu,
  onToggleSiju,
  onChangeHourRule,
  onChangeGender,
}: {
  useWoldu: boolean;
  useSiju: boolean;
  hourRule: HourRule;
  gender: "male" | "female";
  onToggleWoldu: (checked: boolean) => void;
  onToggleSiju: (checked: boolean) => void;
  onChangeHourRule: (rule: HourRule) => void;
  onChangeGender: (gender: "male" | "female") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 mb-4">
      <div>
        <p className="font-medium mb-2">월두/시두</p>
        <span className="mr-3 chkContainer">
          <input
            type="checkbox"
            id="useWoldu"
            checked={useWoldu}
            onChange={(e) => onToggleWoldu(e.target.checked)}
          />
          <label htmlFor="useWoldu" className="ml-1">월두법 적용</label>
        </span>
        <span className="chkContainer">
          <input
            type="checkbox"
            id="useSidu"
            checked={useSiju}
            onChange={(e) => onToggleSiju(e.target.checked)}
          />
          <label htmlFor="useSidu" className="ml-1">시두법 적용</label>
        </span>
      </div>

      <div>
        <p className="font-medium mb-2">시각 기준</p>
        <span className="mr-3 chkContainer">
          <input
            type="radio"
            id="jasi"
            checked={hourRule === "자시"}
            onChange={() => onChangeHourRule("자시")}
          />
          <label htmlFor="jasi" className="ml-1">자시</label>
        </span>
        <span className="chkContainer">
          <input
            type="radio"
            id="insi"
            checked={hourRule === "인시"}
            onChange={() => onChangeHourRule("인시")}
          />
          <label htmlFor="insi" className="ml-1">인시</label>
        </span>
      </div>

      <div>
        <p className="font-medium mb-2">성별</p>
        <span className="mr-3 chkContainer">
          <input
            type="radio"
            id="male"
            checked={gender === "male"}
            onChange={() => onChangeGender("male")}
          />
          <label htmlFor="male" className="ml-1">남자</label>
        </span>
        <span className="chkContainer">
          <input
            type="radio"
            id="female"
            checked={gender === "female"}
            onChange={() => onChangeGender("female")}
          />
          <label htmlFor="female" className="ml-1">여자</label>
        </span>
      </div>
    </div>
  );
}
