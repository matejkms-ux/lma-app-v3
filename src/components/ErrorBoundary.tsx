import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DeviceFrame } from './DeviceFrame';
import { StatusBar } from './StatusBar';

/**
 * Top-level error boundary. Without one, a throw anywhere in the tree (e.g. an
 * unhandled media error bubbling out of <AudioPlayer>) unmounts everything and
 * the learner is left on a blank white screen with no way back. Here we catch
 * it and offer a calm, on-brand fallback with a one-tap Reload instead.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for debugging; the UI itself stays calm.
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <DeviceFrame tone="dark">
        <StatusBar tone="dark" />
        <div className="flex flex-1 flex-col items-center justify-center px-9 text-center">
          <div className="font-serif text-[34px] italic leading-[1.08] text-cream">
            Something
            <br />
            slipped.
          </div>
          <div className="mt-3.5 max-w-[16rem] text-sm leading-relaxed text-teal">
            The practice player hit a snag. Your progress is saved — a reload picks up where you left off.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 rounded-[14px] bg-coral px-7 py-3 text-[13px] font-bold tracking-[.12em] text-cream"
          >
            RELOAD
          </button>
        </div>
      </DeviceFrame>
    );
  }
}
