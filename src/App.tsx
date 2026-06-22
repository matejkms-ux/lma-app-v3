import { Navigate, Route, Routes } from 'react-router-dom';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LessonsScreen } from './screens/LessonsScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { ActivitiesScreen } from './screens/ActivitiesScreen';
import { SentencesScreen } from './screens/SentencesScreen';
import { AdminScreen } from './screens/AdminScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryScreen />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/lessons" element={<LessonsScreen />} />
      <Route path="/practice" element={<PracticeScreen />} />
      <Route path="/overview" element={<OverviewScreen />} />
      <Route path="/activities" element={<ActivitiesScreen />} />
      <Route path="/sentences" element={<SentencesScreen />} />
      <Route path="/admin" element={<AdminScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
