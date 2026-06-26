import { useMemo, useState } from 'react';
import { detectMicEnv } from '../lib/micEnv';
import type { RecorderStatus } from '../practice/useRecorder';

/**
 * Loud, actionable mic-trouble banner. Recording used to fail silently — the take
 * was dropped and the learner never knew why. This names the reason (in-app
 * browser, blocked permission, unsupported) and tells them exactly how to fix it,
 * with a Retry that re-requests permission in place.
 *
 * Renders nothing when the mic is fine, so it's safe to mount unconditionally.
 */
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

  // Decide what (if anything) to show. A hard environmental block wins; otherwise
  // a runtime denial/unsupported from an actual record attempt.
  let title = '';
  let hint = '';
  let showRetry = false;
  let showCopyLink = false;

  if (env.block) {
    title = env.title;
    hint = env.hint;
    showCopyLink = env.block === 'inapp';
    showRetry = env.block === 'insecure' || env.block === 'no-api' ? false : false;
  } else if (status === 'denied') {
    const noMic = errorName === 'NotFoundError' || errorName === 'OverconstrainedError';
    title = noMic ? 'No microphone found' : 'Microphone is blocked';
    hint = noMic
      ? 'No mic is available to this device. Check your microphone, then tap Retry.'
      : 'Your recordings won’t save until you allow the mic. Tap the lock / aA icon in the address bar → Microphone → Allow (on iPhone also Settings → Safari → Microphone), then Retry.';
    showRetry = true;
  } else if (status === 'unsupported') {
    title = 'This browser can’t record';
    hint = 'Recording isn’t supported here. Open the app in Safari (iPhone) or Chrome (Android).';
  } else {
    return null;
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
