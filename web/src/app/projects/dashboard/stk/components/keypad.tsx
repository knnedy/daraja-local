import { DeleteIcon } from "lucide-react";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

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
    <div className="grid grid-cols-3 gap-1.5 px-5 pb-3">
      {keys.map((key, i) => {
        if (key === "") return <div key={`gap-${i}`} />;

        if (key === "back") {
          return (
            <button
              key="back"
              type="button"
              disabled={disabled}
              onClick={onBackspace}
              className="flex h-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30">
              <DeleteIcon className="size-4" />
            </button>
          );
        }

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key)}
            className="h-9 rounded-lg font-mono text-[13px] text-white/80 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30">
            {key}
          </button>
        );
      })}
    </div>
  );
}
