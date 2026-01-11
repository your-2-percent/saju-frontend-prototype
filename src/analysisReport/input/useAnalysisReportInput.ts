import { useState } from "react";
import type { BlendTab } from "../calc/logic/blend";

export type BigTabKey = "격국 · 물상론" | "일간 · 오행 강약" | "용신추천" | "형충회합" | "신살";

export function useAnalysisReportInput() {
  const [bigTab, setBigTab] = useState<BigTabKey>("일간 · 오행 강약");
  const [blendTab, setBlendTab] = useState<BlendTab>("원국");
  const [demoteAbsent, setDemoteAbsent] = useState(true);

  return {
    bigTab,
    setBigTab,
    blendTab,
    setBlendTab,
    demoteAbsent,
    setDemoteAbsent,
  };
}
