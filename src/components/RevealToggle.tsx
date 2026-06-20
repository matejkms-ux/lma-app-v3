import type { ReactNode } from 'react';

/**
 * A folded reveal — transliteration / translation sit closed by default with a
 * clear switch affordance, opening on tap (per the user's note and Matej's
 * comment: "folded but clear to click and open").
 */
export function RevealToggle({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="mb-2 w-full rounded-[14px] border border-teal/25 px-3.5 py-3 text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold tracking-[.12em] text-teal">{label}</span>
        <span
          className={`relative h-[22px] w-10 shrink-0 rounded-xl transition-colors ${open ? 'bg-teal' : 'bg-teal/25'}`}
        >
          <span
            className={`absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all ${open ? 'left-5 bg-emerald' : 'left-[2px] bg-teal'}`}
          />
        </span>
      </div>
      <div
        className="overflow-hidden transition-[max-height] duration-300"
        style={{ maxHeight: open ? 100 : 0 }}
      >
        <div className="pt-2.5 text-center">{children}</div>
      </div>
    </button>
  );
}
