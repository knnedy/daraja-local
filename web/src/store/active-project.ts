import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveProjectState {
  name: string | null;
  setActiveProject: (name: string) => void;
  clearActiveProject: () => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      name: null,
      setActiveProject: (name) => set({ name }),
      clearActiveProject: () => set({ name: null }),
    }),
    { name: "daraja-local-active-project" },
  ),
);
