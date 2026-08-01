import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveProjectState {
  slug: string | null;
  name: string | null;
  setActiveProject: (slug: string, name: string) => void;
  clearActiveProject: () => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      slug: null,
      name: null,
      setActiveProject: (slug, name) => set({ slug, name }),
      clearActiveProject: () => set({ slug: null, name: null }),
    }),
    { name: "daraja-local-active-project" },
  ),
);
