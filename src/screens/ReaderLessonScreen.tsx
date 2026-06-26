import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { AudioPlayer } from '../components/AudioPlayer';
import { readerLessonByCode, type ReaderSentence } from '../data/readerLessons';

type Phase = 'listen' | 'rate' | 'read';

/** Self-rating labels for "how much did you understand?" (1–5). */
const UNDERSTOOD_LABELS = ['', 'Almost nothing', 'A little', 'About half', 'Most of it', 'Almost everything'];

function fmt(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Step 1 — listen to the whole conversation, no text. Finishing it unlocks reading. */
function ListenPhase({
  audio,
  listened,
  onListened,
  onContinue,
}: {
  audio: string;
  listened: boolean;
  onListened: () => void;
  onContinue: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="text-[11px] font-bold tracking-[.18em] text-teal-dim">STEP ONE</div>
        <div className="mt-1 font-serif text-[40px] leading-none text-cream">Listen</div>
        <p className="mt-5 max-w-[15rem] font-serif text-[15px] italic leading-relaxed text-teal">
          Just listen to the whole conversation. Let the meaning wash over you — then say how much
          you understood.
        </p>
        <div className="relative mt-9 flex h-32 w-32 items-center justify-center">
          {playing && <span className="absolute inset-0 rounded-full bg-coral/20 animate-pring" />}
          <span
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 ${
              playing ? 'border-coral text-coral' : 'border-teal/40 text-teal'
            }`}
          >
            <span className="flex items-end gap-[3px]">
              <i className="w-[3px] rounded bg-current" style={{ height: playing ? 22 : 12 }} />
              <i className="w-[3px] rounded bg-current" style={{ height: playing ? 34 : 20 }} />
              <i className="w-[3px] rounded bg-current" style={{ height: playing ? 16 : 14 }} />
            </span>
          </span>
        </div>
      </div>
      <div className="shrink-0 pb-3">
        <AudioPlayer src={audio} onEnded={onListened} onPlayingChange={setPlaying} />
      </div>
      <div className="shrink-0 px-6 pb-6 pt-3">
        <button
          onClick={onContinue}
          disabled={!listened}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold tracking-[.04em] ${
            listened ? 'bg-cream text-emerald' : 'bg-cream/15 text-teal-dim'
          }`}
        >
          {listened ? 'Rate what I understood →' : 'Finish listening to continue'}
        </button>
      </div>
    </>
  );
}

/** Step 2 — self-rate how much you understood from listening alone, before seeing the text. */
function RatePhase({
  stars,
  onRate,
  onContinue,
}: {
  stars: number;
  onRate: (n: number) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="text-[11px] font-bold tracking-[.18em] text-teal-dim">STEP TWO</div>
        <div className="mt-1 font-serif text-[32px] leading-tight text-cream">
          How much did you understand?
        </div>
        <p className="mt-4 max-w-[16rem] font-serif text-[15px] italic leading-relaxed text-teal">
          From listening only — be honest. You'll read the text next.
        </p>
        <div className="mt-9 flex items-center gap-2.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onRate(n)}
              aria-label={`${n} of 5`}
              className={`text-[36px] leading-none transition-transform active:scale-90 ${
                n <= stars ? 'text-coral' : 'text-teal/25'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="mt-3 h-5 text-[13px] font-semibold tracking-[.02em] text-teal">
          {stars > 0 ? UNDERSTOOD_LABELS[stars] : ''}
        </div>
      </div>
      <div className="shrink-0 px-6 pb-6 pt-3">
        <button
          onClick={onContinue}
          disabled={stars === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold tracking-[.04em] ${
            stars > 0 ? 'bg-cream text-emerald' : 'bg-cream/15 text-teal-dim'
          }`}
        >
          {stars > 0 ? 'Now read it →' : 'Pick a rating to continue'}
        </button>
      </div>
    </>
  );
}

/** Step 3 — read along; the current line highlights with the audio, tap a line for English. */
function ReadPhase({ audio, sentences }: { audio: string; sentences: ReaderSentence[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Active line = the last sentence whose start has passed.
  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < sentences.length; i++) {
      if (cur + 0.15 >= sentences[i].start) idx = i;
      else break;
    }
    return idx;
  }, [cur, sentences]);

  // Keep the active line in view while playing.
  useEffect(() => {
    if (playing && activeIndex >= 0) {
      rowRefs.current[activeIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeIndex, playing]);

  // Stop playback on unmount — a detached <audio> keeps playing until GC,
  // which is how a previous lesson bleeds under the next one.
  useEffect(() => {
    const a = audioRef.current;
    return () => {
      if (a) {
        a.pause();
        a.src = '';
      }
    };
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  // Tapping a line: reveal its English, jump there, and play from it.
  const tapLine = (i: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
    const a = audioRef.current;
    if (a) {
      try {
        a.currentTime = sentences[i].start;
      } catch {
        /* ignore unseekable edge */
      }
      setCur(sentences[i].start);
    }
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={audio}
        preload="auto"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="scroll-region flex-1 px-6 pb-4 pt-1">
        <div className="mb-3 text-[11px] font-bold tracking-[.18em] text-teal-dim">
          STEP THREE · READ — tap a line for English
        </div>
        {sentences.map((s, i) => {
          const active = i === activeIndex;
          const show = revealed.has(i);
          return (
            <button
              key={s.i}
              ref={(el) => (rowRefs.current[i] = el)}
              onClick={() => tapLine(i)}
              className="block w-full border-b border-teal/10 py-3 text-left"
            >
              <span
                className={`block font-serif text-[19px] leading-snug transition-colors ${
                  active ? 'text-coral' : 'text-cream'
                }`}
              >
                {s.de}
              </span>
              {show && (
                <span className="mt-1 block text-[14px] italic leading-snug text-teal">{s.en}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-3 px-6 pb-6 pt-3">
        <button
          onClick={togglePlay}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-base text-emerald"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex-1">
          <div className="h-[5px] overflow-hidden rounded-[3px] bg-teal/[.22]">
            <div
              className="h-full rounded-[3px] bg-teal transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-[.1em] text-teal-dim">
            <span>{fmt(cur)}</span>
            <span>{playing ? 'PLAYING' : 'PAUSED'}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/** Reader lesson — three phases: listen only → rate understanding → listen & read. */
export function ReaderLessonScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const code = (location.state as { code?: string } | null)?.code;
  const lesson = code ? readerLessonByCode(code) : undefined;
  const ratingKey = `lma:reader:understood:${code}`;

  const [phase, setPhase] = useState<Phase>('listen');
  const [listened, setListened] = useState(false);
  // Self-rated comprehension (1–5), remembered per lesson so it survives navigation.
  const [understood, setUnderstood] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(ratingKey)) || 0;
    } catch {
      return 0;
    }
  });

  const rate = (n: number) => {
    setUnderstood(n);
    try {
      localStorage.setItem(ratingKey, String(n));
    } catch {
      /* ignore */
    }
  };

  if (!code || !lesson) return <Navigate to="/reader" replace />;

  // A pill is reachable once its prerequisite is met (listen → rate → read).
  const lockedFor = (p: Phase) =>
    (p === 'rate' && !listened) || (p === 'read' && understood === 0);

  return (
    <DeviceFrame tone="dark">
      <StatusBar tone="dark" />
      <div className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-3">
        <button onClick={() => navigate('/reader')} className="text-cream/70 text-xl" aria-label="Back">
          ‹
        </button>
        <div className="flex-1">
          <div className="text-[10.5px] font-bold tracking-[.08em] text-coral">
            {lesson.title.toUpperCase()}
          </div>
        </div>
        {/* Phase pills */}
        <div className="flex items-center gap-1 rounded-full border border-teal/20 p-[3px]">
          {(['listen', 'rate', 'read'] as Phase[]).map((p) => {
            const on = phase === p;
            const locked = lockedFor(p);
            return (
              <button
                key={p}
                onClick={() => !locked && setPhase(p)}
                disabled={locked}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize tracking-[.06em] ${
                  on ? 'bg-cream text-emerald' : locked ? 'text-teal-dim' : 'text-teal'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {phase === 'listen' && (
        <ListenPhase
          audio={lesson.audio}
          listened={listened}
          onListened={() => setListened(true)}
          onContinue={() => setPhase('rate')}
        />
      )}
      {phase === 'rate' && (
        <RatePhase stars={understood} onRate={rate} onContinue={() => setPhase('read')} />
      )}
      {phase === 'read' && <ReadPhase audio={lesson.audio} sentences={lesson.sentences} />}
    </DeviceFrame>
  );
}
