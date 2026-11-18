import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/lib/snippets/generate";

interface SnippetLanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/** The language picked on any page's code snippets, remembered for every page. */
export const useSnippetLanguage = create<SnippetLanguageState>()(
  persist(
    (set) => ({
      language: "body",
      setLanguage: (language) => set({ language }),
    }),
    { name: "daraja-local-snippet-language" },
  ),
);
