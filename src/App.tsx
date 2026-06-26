import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LessonsScreen } from './screens/LessonsScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { ActivitiesScreen } from './screens/ActivitiesScreen';
import { SentencesScreen } from './screens/SentencesScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ReadingTestScreen } from './screens/ReadingTestScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { ReaderLessonScreen } from './screens/ReaderLessonScreen';
import { HubScreen } from './screens/super/HubScreen';
import { CompanionCourseScreen } from './screens/super/CompanionCourseScreen';
import { CompanionPlayerScreen } from './screens/super/CompanionPlayerScreen';
import { ReaderLibraryScreen } from './screens/super/ReaderLibraryScreen';
import { ReaderImportScreen } from './screens/super/ReaderImportScreen';
import { ReadingScreen } from './screens/super/ReadingScreen';
import { ReviewScreen } from './screens/super/ReviewScreen';
import { WatchLibraryScreen } from './screens/super/WatchLibraryScreen';
import { WatchPlayerScreen } from './screens/super/WatchPlayerScreen';
import { WatchQuizScreen } from './screens/super/WatchQuizScreen';
// Lazy — keeps the heavy @zoom/videosdk out of the main bundle (loads only on /session/*).
const VideoSessionScreen = lazy(() => import('./screens/VideoSessionScreen'));

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<EntryScreen />} />
        {/* Super-app shell — the Adventure Hub and the four modes. */}
        <Route path="/hub" element={<HubScreen />} />
        <Route path="/companion" element={<CompanionCourseScreen />} />
        <Route path="/companion/play" element={<CompanionPlayerScreen />} />
        <Route path="/read" element={<ReaderLibraryScreen />} />
        <Route path="/read/import" element={<ReaderImportScreen />} />
        <Route path="/read/text" element={<ReadingScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/watch" element={<WatchLibraryScreen />} />
        <Route path="/watch/play" element={<WatchPlayerScreen />} />
        <Route path="/watch/quiz" element={<WatchQuizScreen />} />
        {/* Practice flow (wired to Supabase) + legacy screens, unchanged. */}
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/lessons" element={<LessonsScreen />} />
        <Route path="/practice" element={<PracticeScreen />} />
        <Route path="/overview" element={<OverviewScreen />} />
        <Route path="/activities" element={<ActivitiesScreen />} />
        <Route path="/sentences" element={<SentencesScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
        <Route path="/reading-test" element={<ReadingTestScreen />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
