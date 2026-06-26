import { useMemo, useState } from 'react';
import { detectMicEnv, SUPPORTED_BROWSERS } from '../lib/micEnv';
import type { RecorderStatus } from '../practice/useRecorder';

/**
 * Mic-trouble + supported-browser guidance. Recording used to fail silently — the
 * take was dropped and the learner never knew why. This component:
 *  - names a hard block (in-app browser, blocked permission, unsupported) and how
 *    to fix it, with a Retry that re-requests permission in place; and
 *  - when nothing is wrong, shows a one-time, dismissible advisory telling people
 *    which browsers recording works in (so they don't start in an in-app browser).
 *
 * Safe to mount unconditionally — renders nothing once the advisory is dismissed
 * and there's no problem.
 */
const DISMISS_KEY = 'lma:browserHintDismissed';

export function MicNotice({
  status,
  errorName,
  onRetry,
}: {
  status: RecorderStatus;
  errorName?: string | null;
  onRetry?: () => void;
}) {
  const env = useMemo(() => detectMicEnv(), []);
  const [copied, setCopied] = useState(false);
  const [advisoryDismissed, setAdvisoryDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismissAdvisory = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage unavailable — just hide for this session */
    }
    setAdvisoryDismissed(true);
  };

  let title = '';
  let hint = '';
  let showRetry = false;
  let showCopyLink = false;

  if (env.block) {
    title = env.title;
    hint = env.hint;
    showCopyLink = env.block === 'inapp';
  } else if (status === 'denied') {
    const noMic = errorName === 'NotFoundError' || errorName === 'OverconstrainedError';
    title = noMic ? 'No microphone found' : 'Microphone is blocked';
    hint = noMic
      ? 'No mic is available to this device. Check your microphone, then tap Retry.'
      : 'Your recordings won’t save until you allow the mic. Tap the lock / aA icon in the address bar → Microphone → Allow (on iPhone also Settings → Safari → Microphone), then Retry.';
    showRetry = true;
  } else if (status === 'unsupported') {
    title = 'This browser can’t record';
    hint = `Recording isn’t supported here. Open the app in ${SUPPORTED_BROWSERS}.`;
  } else {
    // Nothing wrong — show the upfront, dismissible supported-browser advisory.
    if (advisoryDismissed) return null;
    return (
      <div className="mx-6 mb-3 shrink-0 rounded-[14px] border border-teal/30 bg-teal/[.08] px-4 py-2.5">
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-px text-[14px] leading-none text-teal">🎙</span>
          <div className="min-w-0 flex-1 text-[12px] leading-[1.45] text-cream/85">
            For recording to work, use {SUPPORTED_BROWSERS} — not a browser opened from
            inside another app (WhatsApp, Instagram…).
          </div>
          <button
            onClick={dismissAdvisory}
            className="-mr-1 -mt-1 shrink-0 px-1.5 py-0.5 text-[13px] leading-none text-teal/70 hover:text-cream"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the URL is still in the address bar */
    }
  };

  return (
    <div className="mx-6 mb-3 shrink-0 rounded-[14px] border border-coral/50 bg-coral/[.12] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-px text-[15px] leading-none text-coral">⚠</span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-extrabold tracking-[.04em] text-cream">{title}</div>
          <div className="mt-1 text-[12px] leading-[1.45] text-cream/80">{hint}</div>
          {(showRetry || showCopyLink) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded-full bg-coral px-3.5 py-1.5 text-[11px] font-bold tracking-[.06em] text-cream active:scale-95"
                >
                  RETRY MIC
                </button>
              )}
              {showCopyLink && (
                <button
                  onClick={copyLink}
                  className="rounded-full border border-coral/60 px-3.5 py-1.5 text-[11px] font-bold tracking-[.06em] text-coral active:scale-95"
                >
                  {copied ? 'LINK COPIED ✓' : 'COPY APP LINK'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
