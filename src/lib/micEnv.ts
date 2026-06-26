/**
 * Why the mic might be unusable BEFORE the learner even taps record. The recorder
 * (`useRecorder`) reports denied/unsupported at runtime; this names the *reason* so
 * we can tell the learner exactly how to fix it instead of failing silently.
 *
 * The big real-world culprit is an in-app browser: opening the app from a link
 * inside WhatsApp / Instagram / Messenger / etc. runs it in an embedded webview
 * that blocks getUserMedia outright. The fix is "open in Safari/Chrome", which a
 * generic "mic blocked" message never tells them.
 */
export type MicBlock = 'inapp' | 'insecure' | 'no-api' | null;

export interface MicEnv {
  /** A hard environmental block detectable before recording, or null if none. */
  block: MicBlock;
  title: string;
  hint: string;
}

/** UA fragments for the common in-app browsers (embedded webviews). */
const IN_APP_UA = [
  'FBAN', 'FBAV', 'FB_IAB', // Facebook / Messenger
  'Instagram',
  'Line/',
  'WhatsApp',
  'Snapchat',
  'Twitter',
  'TikTok', 'musical_ly', 'BytedanceWebview',
  'GSA/', // Google App
  'MicroMessenger', // WeChat
];

function isInAppBrowser(ua: string): boolean {
  return IN_APP_UA.some((frag) => ua.includes(frag));
}

export function detectMicEnv(): MicEnv {
  if (typeof navigator === 'undefined') {
    return { block: 'no-api', title: 'Recording unavailable', hint: 'No browser environment.' };
  }
  const ua = navigator.userAgent || '';

  // Secure context is required for getUserMedia (https or localhost).
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return {
      block: 'insecure',
      title: 'Recording needs a secure page',
      hint: 'Open the app over https (the normal app link) — recording is blocked on insecure pages.',
    };
  }

  // No API at all → either an old browser or an embedded webview that hides it.
  const hasApi =
    Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  if (isInAppBrowser(ua)) {
    return {
      block: 'inapp',
      title: 'Open in Safari or Chrome to record',
      hint:
        "You're in an app's built-in browser (e.g. opened from a chat link), which blocks the microphone. Tap the ••• or share menu and choose “Open in Safari/Chrome”, then try again.",
    };
  }

  if (!hasApi) {
    return {
      block: 'no-api',
      title: 'This browser can’t record',
      hint: 'Recording isn’t supported here. Open the app in Safari, Chrome, Edge, or Firefox.',
    };
  }

  return { block: null, title: '', hint: '' };
}

/** Browsers where recording is known to work, named for the upfront advisory. */
export const SUPPORTED_BROWSERS = 'Safari, Chrome, Edge, or Firefox';
