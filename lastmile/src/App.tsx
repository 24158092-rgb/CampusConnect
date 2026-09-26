import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import AlertsHub from './pages/AlertsHub';
import BroadcastHub from './pages/BroadcastHub';
import Command from './pages/Command';
import Dataset from './pages/Dataset';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import ResidentApp from './pages/ResidentApp';
import ResponsesHub from './pages/ResponsesHub';
import Safety from './pages/Safety';
import { useSession, type Role } from './store/useSession';

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const current = useSession((s) => s.role);
  if (current === role) return <>{children}</>;
  if (current === 'user') return <Navigate to="/resident" replace />;
  return <Navigate to="/login" replace />;
}

/** Older module URLs now live as tabs; keep them working (the demo and bookmarks use them). */
const LEGACY: [string, string][] = [
  ['official', '/alerts/official'],
  ['clarity', '/alerts/simplified'],
  ['language', '/alerts/translations'],
  ['visual', '/alerts/visual'],
  ['pipeline', '/alerts/integrity'],
  ['delivery', '/broadcast/network'],
  ['receipts', '/responses/tracked'],
  ['analytics', '/responses/analytics'],
];

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          path="resident"
          element={
            <RequireRole role="user">
              <ResidentApp />
            </RequireRole>
          }
        />
        <Route
          element={
            <RequireRole role="admin">
              <Layout />
            </RequireRole>
          }
        >
          <Route index element={<Command />} />
          <Route path="alerts" element={<Navigate to="/alerts/official" replace />} />
          <Route path="alerts/:tab" element={<AlertsHub />} />
          <Route path="map" element={<MapPage />} />
          <Route path="broadcast" element={<Navigate to="/broadcast/all" replace />} />
          <Route path="broadcast/:tab" element={<BroadcastHub />} />
          <Route path="responses" element={<Navigate to="/responses/residents" replace />} />
          <Route path="responses/:tab" element={<ResponsesHub />} />
          <Route path="safety" element={<Safety />} />
          <Route path="dataset" element={<Dataset />} />
          {LEGACY.map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
