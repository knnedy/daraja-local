import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveProjectState {
  slug: string | null;
  setActiveProjectSlug: (slug: string) => void;
  clearActiveProject: () => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      slug: null,
      setActiveProjectSlug: (slug) => set({ slug }),
      clearActiveProject: () => set({ slug: null }),
    }),
    {
      name: "daraja-local-active-project",
    },
  ),
);
