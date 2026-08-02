"use client";

import { DeleteIcon } from "lucide-react";

const digitKeys: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

export default function Keypad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 px-5 pb-3">
      {digitKeys.map((key) => (
        <button
          key={key.digit}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(key.digit)}
          className="flex h-10 flex-col items-center justify-center gap-0.5 rounded-full bg-white/5 leading-none text-white/85 transition-all duration-100 hover:bg-white/10 active:scale-90 active:bg-white/15 disabled:opacity-30 disabled:active:scale-100">
          <span className="font-mono text-[14px] font-medium">
            {key.digit}
          </span>
          {key.letters && (
            <span className="font-mono text-[6px] tracking-[0.15em] text-white/40">
              {key.letters}
            </span>
          )}
        </button>
      ))}

      <div />

      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className="flex h-10 items-center justify-center rounded-full bg-white/5 text-white/85 transition-all duration-100 hover:bg-white/10 active:scale-90 active:bg-white/15 disabled:opacity-30 disabled:active:scale-100">
        <span className="font-mono text-[14px] font-medium">0</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onBackspace}
        className="flex h-10 items-center justify-center rounded-full text-white/40 transition-all duration-100 hover:bg-white/5 hover:text-white/70 active:scale-90 disabled:opacity-30 disabled:active:scale-100">
        <DeleteIcon className="size-4" />
      </button>
    </div>
  );
}