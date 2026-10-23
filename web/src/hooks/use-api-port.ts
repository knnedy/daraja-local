import { useSyncExternalStore } from "react";
import { DEFAULT_PORT, getApiPort } from "@/lib/api-origin";

const subscribeNoop = () => () => {};

export function useApiPort(): number {
  return useSyncExternalStore(subscribeNoop, getApiPort, () => DEFAULT_PORT);
}
