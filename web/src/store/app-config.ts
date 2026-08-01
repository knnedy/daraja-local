import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppConfigState {
  port: number;
  setPort: (port: number) => void;
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set) => ({
      port: 7060,
      setPort: (port) => set({ port }),
    }),
    { name: "daraja-local-app-config" },
  ),
);
