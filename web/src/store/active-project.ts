import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveProjectState {
  name: string | null;
  callbackBaseurl: string | null;
  setActiveProject: (name: string, callbackBaseurl: string) => void;
  clearActiveProject: () => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      name: null,
      callbackBaseurl: null,
      setActiveProject: (name, callbackBaseurl) =>
        set({ name, callbackBaseurl }),
      clearActiveProject: () => set({ name: null, callbackBaseurl: null }),
    }),
    {
      name: "daraja-local-active-project",
    },
  ),
);
