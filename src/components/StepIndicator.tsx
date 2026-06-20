import { STEPS, type Step } from '../tokens';

interface Props {
  currentIndex: number;
  isUnlocked?: (s: Step) => boolean;
  onGoto?: (s: Step) => void;
}

export function StepIndicator({ currentIndex, isUnlocked, onGoto }: Props) {
  return (
    <div className="flex shrink-0 gap-[5px] px-[22px] pt-4">
      {STEPS.map((name, i) => {
        const locked = isUnlocked ? !isUnlocked(name) : false;
        const done = i < currentIndex;
        const on = i === currentIndex;

        const barClass = locked
          ? 'bg-teal/[.09]'
          : done ? 'bg-teal'
          : on ? 'bg-cream'
          : 'bg-teal/[.22]';

        const lblClass = locked
          ? 'text-teal/25'
          : done ? 'text-teal'
          : on ? 'text-cream font-extrabold'
          : 'text-teal/50';

        const tappable = !!onGoto; // all steps navigable; lock only suppresses audio

        return (
          <button
            key={name}
            disabled={!onGoto}
            onClick={tappable ? () => onGoto!(name) : undefined}
            className={`flex-1 text-center ${tappable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {locked ? (
              <div className="mb-[3px] flex justify-center">
                <svg width="7" height="9" viewBox="0 0 7 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1.5 4V2.8a2 2 0 0 1 4 0V4"
                    stroke="rgba(107,190,170,0.28)"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                  <rect x="0.5" y="3.5" width="6" height="5" rx="1.2" fill="rgba(107,190,170,0.18)" />
                </svg>
              </div>
            ) : null}
            <div className={`h-[5px] rounded-[3px] ${barClass}`} />
            <div className={`mt-1.5 text-[9px] font-semibold tracking-[.04em] ${lblClass}`}>{name}</div>
          </button>
        );
      })}
    </div>
  );
}
