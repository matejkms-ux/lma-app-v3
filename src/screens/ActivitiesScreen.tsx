import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { METRICS, RECENT_ACTIVITY, REPS_CHART } from '../data/mock';
import { useSession } from '../session';

// Bar colour deepens left→right to read as progress over time.
const BAR_COLORS = ['#CFE0D6', '#CFE0D6', '#9BC4B8', '#9BC4B8', '#5C9A8C', '#5C9A8C', '#0E635B', '#0E635B', '#0A554E', '#0A554E'];

/** Activities — the long view: reps over time, headline stats, recent history. */
export function ActivitiesScreen() {
  const { user } = useSession();
  const language = user?.language ?? 'JAPANESE';
  const stats = [
    { v: String(METRICS.lessonsPassed), l: 'LESSONS DONE' },
    { v: `${METRICS.avgGradeSelf}★`, l: 'AVG GRADE' },
    { v: String(METRICS.dayStreak), l: 'DAY STREAK' },
  ];

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-1 pt-4">
        <div className="text-[11px] font-bold tracking-[.12em] text-muted">
          DAY {METRICS.dayOfProgram} OF {METRICS.programLength} · {language}
        </div>
        <div className="mt-1 font-serif text-[28px] italic text-heading">Your adventure</div>
      </div>

      <div className="scroll-region flex-1 px-5 pb-5 pt-2">
        {/* Reps chart */}
        <div className="rounded-[18px] border border-rule bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold tracking-[.1em] text-muted">REPS GATHERED</span>
            <span className="text-[13px] font-extrabold text-emerald">{METRICS.repsLifetime}</span>
          </div>
          <div className="mt-3.5 flex h-[60px] items-end gap-[5px]">
            {REPS_CHART.map((h, i) => (
              <i key={i} className="flex-1 rounded-[3px]" style={{ height: `${h}%`, background: BAR_COLORS[i] }} />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3.5 flex gap-2.5">
          {stats.map((s) => (
            <div key={s.l} className="flex-1 rounded-[14px] border border-rule bg-white px-2 py-3.5 text-center">
              <div className="text-[21px] font-extrabold leading-none text-emerald">{s.v}</div>
              <div className="mt-1 text-[9px] font-semibold text-muted">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Recent */}
        <div className="mx-0.5 mb-2.5 mt-[18px] text-[11px] font-bold tracking-[.12em] text-muted">RECENTLY</div>
        {RECENT_ACTIVITY.map((a, i) => (
          <div
            key={i}
            className={`flex gap-3 py-2 ${i === RECENT_ACTIVITY.length - 1 ? '' : 'border-b border-rule-soft'}`}
          >
            <span className="w-11 shrink-0 text-[10px] font-semibold text-muted">{a.date}</span>
            <span className="flex-1 text-xs text-heading">{a.text}</span>
          </div>
        ))}
      </div>

      <BottomNav active="activities" />
    </DeviceFrame>
  );
}
