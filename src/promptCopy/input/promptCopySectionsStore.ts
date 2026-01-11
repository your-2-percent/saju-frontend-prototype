import { create } from "zustand";

export type PromptCopySections = {
  twelveUnseong: boolean;
  twelveShinsal: boolean;
  shinsal: boolean;
  nabeum: boolean;
};

type State = {
  sections: PromptCopySections;
  setSections: (next: PromptCopySections) => void;
  toggleSection: (key: keyof PromptCopySections) => void;
};

const DEFAULT_SECTIONS: PromptCopySections = {
  twelveUnseong: true,
  twelveShinsal: true,
  shinsal: true,
  nabeum: true,
};

export const usePromptCopySectionsStore = create<State>((set) => ({
  sections: DEFAULT_SECTIONS,
  setSections: (next) => set({ sections: next }),
  toggleSection: (key) =>
    set((s) => ({ sections: { ...s.sections, [key]: !s.sections[key] } })),
}));
