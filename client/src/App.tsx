import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import KanbanPage from './pages/KanbanPage';
import WorkerPage from './pages/WorkerPage';
import PMChatPage from './pages/PMChatPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<KanbanPage />} />
        <Route path="/workers" element={<WorkerPage />} />
        <Route path="/pm" element={<PMChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
