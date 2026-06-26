import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DeepLink } from './deeplink';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LessonsScreen } from './screens/LessonsScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { SentencesScreen } from './screens/SentencesScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ReadingTestScreen } from './screens/ReadingTestScreen';
import { FinalHubScreen } from './screens/FinalHubScreen';
import { FinalReadingScreen } from './screens/FinalReadingScreen';
import { PodcastScreen } from './screens/PodcastScreen';
import { FinalWritingScreen } from './screens/FinalWritingScreen';
import { FinalConversationScreen } from './screens/FinalConversationScreen';
import { FinalSessionScreen } from './screens/FinalSessionScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { ReaderLessonScreen } from './screens/ReaderLessonScreen';
// Lazy — keeps the heavy @zoom/videosdk out of the main bundle (loads only on /session/*).
const VideoSessionScreen = lazy(() => import('./screens/VideoSessionScreen'));
import VideoRosterScreen from './screens/VideoRosterScreen';

export default function App() {
  return (
    <ErrorBoundary>
      <DeepLink />
      <Routes>
        <Route
          path="/"
          element={
            (import.meta.env.VITE_APP_MODE as string | undefined) === 'video' ? (
              <VideoRosterScreen />
            ) : (
              <EntryScreen />
            )
          }
        />
        {/* Practice flow (wired to Supabase) + legacy screens, unchanged. */}
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/lessons" element={<LessonsScreen />} />
        <Route path="/practice" element={<PracticeScreen />} />
        <Route path="/overview" element={<OverviewScreen />} />
        <Route path="/sentences" element={<SentencesScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
        <Route path="/reading-test" element={<ReadingTestScreen />} />
        {/* LMA Final App — five modules over a per-adventurer content layer. */}
        <Route path="/final" element={<FinalHubScreen />} />
        <Route path="/final-reading" element={<FinalReadingScreen />} />
        <Route path="/podcast" element={<PodcastScreen />} />
        <Route path="/final-writing" element={<FinalWritingScreen />} />
        <Route path="/final-conversation" element={<FinalConversationScreen />} />
        <Route path="/final-session" element={<FinalSessionScreen />} />
        <Route path="/reader" element={<ReaderScreen />} />
        <Route path="/reader-lesson" element={<ReaderLessonScreen />} />
        <Route
          path="/session/:sessionId"
          element={
            <Suspense fallback={<div style={{ padding: 32 }}>Loading session…</div>}>
              <VideoSessionScreen />
            </Suspense>
          }
        />
        <Route path="/rooms" element={<VideoRosterScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
