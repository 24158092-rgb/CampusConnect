import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Alerts from './pages/Alerts';
import Clarity from './pages/Clarity';
import Dashboard from './pages/Dashboard';
import Delivery from './pages/Delivery';
import Language from './pages/Language';
import Official from './pages/Official';
import Pipeline from './pages/Pipeline';
import Receipts from './pages/Receipts';
import Visual from './pages/Visual';

// Recharts is only needed on the analytics page.
const Analytics = lazy(() => import('./pages/Analytics'));

const ChartsLoading = () => (
  <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading analytics">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="skeleton h-72" />
    ))}
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="official" element={<Official />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="clarity" element={<Clarity />} />
          <Route path="language" element={<Language />} />
          <Route path="visual" element={<Visual />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="receipts" element={<Receipts />} />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<ChartsLoading />}>
                <Analytics />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
