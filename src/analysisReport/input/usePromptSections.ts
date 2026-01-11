// features/AnalysisReport/hooks/usePromptSections.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SectionsState = {
  twelveUnseong: boolean;
  twelveShinsal: boolean;
  shinsal: boolean;
  nabeum: boolean;
};

export type SectionKey = keyof SectionsState;

const DEFAULT_SECTIONS: SectionsState = {
  twelveUnseong: true,
  twelveShinsal: true,
  shinsal: true,
  nabeum: true,
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const coerceSections = (raw: unknown): SectionsState => {
  const merged: SectionsState = { ...DEFAULT_SECTIONS };
  if (!isPlainObject(raw)) return merged;

  (Object.keys(DEFAULT_SECTIONS) as SectionKey[]).forEach((k) => {
    const v = raw[k];
    if (typeof v === "boolean") merged[k] = v;
  });

  return merged;
};

type LoadRow = { sections: unknown } | null;

export function usePromptSectionsDB(msId: string | null | undefined) {
  const [sections, setSections] = useState<SectionsState>(DEFAULT_SECTIONS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const didHydrateRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const canUse = useMemo(() => typeof msId === "string" && msId.length > 0, [msId]);

  // 1) 로드
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!canUse) {
        setSections(DEFAULT_SECTIONS);
        setIsLoading(false);
        didHydrateRef.current = true;
        return;
      }

      setIsLoading(true);

      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;

      if (!user) {
        // 로그인 전이면 그냥 기본값 (원하면 여기서 localStorage fallback도 가능)
        if (!cancelled) {
          setSections(DEFAULT_SECTIONS);
          setIsLoading(false);
          didHydrateRef.current = true;
        }
        return;
      }

      const { data, error } = await supabase
        .from("analysis_prompt_prefs")
        .select("sections")
        .eq("user_id", user.id)
        .eq("ms_id", msId)
        .maybeSingle<LoadRow>();

      if (cancelled) return;

      if (error) {
        console.error("[analysis_prompt_prefs] load error:", error);
        setSections(DEFAULT_SECTIONS);
      } else {
        const next = coerceSections(data?.sections ?? null);
        setSections(next);
      }

      setIsLoading(false);
      didHydrateRef.current = true;
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [canUse, msId]);

  // 2) 자동 저장(디바운스)
  useEffect(() => {
    if (!canUse) return;
    if (!didHydrateRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const userRes = await supabase.auth.getUser();
        const user = userRes.data.user;
        if (!user) return;

        setIsSaving(true);

        const payload = {
          user_id: user.id,
          ms_id: msId,
          sections,
        };

        const { error } = await supabase
          .from("analysis_prompt_prefs")
          .upsert(payload, { onConflict: "user_id,ms_id" });

        if (error) {
          console.error("[analysis_prompt_prefs] save error:", error);
        }

        setIsSaving(false);
      })();
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [canUse, msId, sections]);

  const toggleSection = (key: SectionKey) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAll = (value: boolean) => {
    setSections({
      twelveUnseong: value,
      twelveShinsal: value,
      shinsal: value,
      nabeum: value,
    });
  };

  return { sections, toggleSection, setAll, isLoading, isSaving, setSections };
}
