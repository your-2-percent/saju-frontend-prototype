import * as Twelve from "@/shared/domain/ganji/twelve";
import type { EraType } from "@/shared/domain/ganji/twelve";

type EraRuntime = {
  Classic?: EraType;
  Modern?: EraType;
  classic?: EraType;
  modern?: EraType;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function mapEra(mode: "classic" | "modern"): EraType {
  const exported = (Twelve as unknown as Record<string, unknown>)["EraType"];
  if (isRecord(exported) && ("Classic" in exported || "Modern" in exported || "classic" in exported || "modern" in exported)) {
    return mode === "classic"
      ? (exported as EraRuntime).Classic ?? (exported as EraRuntime).classic!
      : (exported as EraRuntime).Modern ?? (exported as EraRuntime).modern!;
  }
  return mode as EraType;
}
