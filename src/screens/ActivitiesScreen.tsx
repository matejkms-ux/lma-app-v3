import { Navigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { lifetimeReps, repsToday, repEvents, type RepEvent } from '../lib/progress';

// Bar colour deepens left→right to read as progress over time.
const BAR_COLORS = ['#CFE0D6', '#CFE0D6', '#9BC4B8', '#9BC4B8', '#5C9A8C', '#5C9A8C', '#0E635B', '#0E635B', '#0A554E', '#0A554E'];

function dailyRepBuckets(events: RepEvent[], days: number): number[] {
  const buckets = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const e of events) {
    const d = new Date(e.ts);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += e.points;
  }
  return buckets;
}

interface RecentRow { date: string; text: string; }

function buildRecent(events: RepEvent[], limit: number): RecentRow[] {
  const rows: RecentRow[] = [];
  const seen = new Set<string>();
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  for (const e of sorted) {
    const date = new Date(e.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const key = `${date}|${e.lesson}|${e.step}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ date, text: `${e.lesson} · ${e.step.charAt(0) + e.step.slice(1).toLowerCase()}` });
    if (rows.length >= limit) break;
  }
  return rows;
}

/** Activities — real progress only; no fabricated days or journey stats. */
export function ActivitiesScreen() {
  const { user } = useSession();
  if (!user) return <Navigate to="/" replace />;

  const language = user.language;
  const lifetime = lifetimeReps(user.id);
  const today = repsToday(user.id);
  const events = repEvents(user.id);
  const hasActivity = events.length > 0;

  const buckets = dailyRepBuckets(events, 10);
  const maxBucket = Math.max(...buckets, 1);
  const recent = buildRecent(events, 8);

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-1 pt-4">
        <div className="text-[11px] font-bold tracking-[.12em] text-muted">{language}</div>
        <div className="mt-1 font-serif text-[28px] italic text-heading">Your adventure</div>
      </div>

      <div className="scroll-region flex-1 px-5 pb-5 pt-2">
        {hasActivity ? (
          <>
            {/* Reps chart — real daily data */}
            <div className="rounded-[18px] border border-rule bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold tracking-[.1em] text-muted">REPS GATHERED</span>
                <span className="text-[13px] font-extrabold text-emerald">{lifetime}</span>
              </div>
              {today > 0 && (
                <div className="mt-1 text-[11px] font-semibold text-coral">+{today} today</div>
              )}
              <div className="mt-3.5 flex h-[60px] items-end gap-[5px]">
                {buckets.map((h, i) => (
                  <i
                    key={i}
                    className="flex-1 rounded-[3px]"
                    style={{ height: `${Math.max(4, Math.round((h / maxBucket) * 100))}%`, background: BAR_COLORS[i] }}
                  />
                ))}
              </div>
            </div>

            {/* Recent activity — real events */}
            <div className="mx-0.5 mb-2.5 mt-[18px] text-[11px] font-bold tracking-[.12em] text-muted">RECENTLY</div>
            {recent.map((r, i) => (
              <div
                key={i}
                className={`flex gap-3 py-2 ${i === recent.length - 1 ? '' : 'border-b border-rule-soft'}`}
              >
                <span className="w-11 shrink-0 text-[10px] font-semibold text-muted">{r.date}</span>
                <span className="flex-1 text-xs text-heading">{r.text}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="mt-16 px-4 text-center">
            <div className="font-serif text-[22px] italic leading-[1.2] text-heading">
              Your adventure<br />begins here.
            </div>
            <div className="mt-3 text-[13px] text-muted">
              Complete your first practice step and your reps will appear here.
            </div>
          </div>
        )}
      </div>

      <BottomNav active="activities" />
    </DeviceFrame>
  );
}
