import { useEffect, useRef, useState } from "react";

/** Copies text and remembers which key was copied for a moment, for a check icon. */
export function useCopy<K extends string = string>(resetMs = 1400) {
  const [copied, setCopied] = useState<K | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string, key = "default" as K) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return false;
    }
    clearTimeout(timer.current);
    setCopied(key);
    timer.current = setTimeout(() => setCopied(null), resetMs);
    return true;
  }

  return { copied, copy };
}
