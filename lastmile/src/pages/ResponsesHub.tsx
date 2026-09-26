import { ChartColumn, ClipboardList, Users } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { EmbeddedContext, PageHeader, RouteTabs, type TabDef } from '../components/ui';
import Receipts from './Receipts';
import ResidentResponses from './ResidentResponses';

const Analytics = lazy(() => import('./Analytics'));

const TABS: TabDef[] = [
  { id: 'residents', label: 'All residents', icon: Users },
  { id: 'tracked', label: 'Tracked recipients', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: ChartColumn },
];

export default function ResponsesHub() {
  const { tab = 'residents' } = useParams();
  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/responses/residents" replace />;
  return (
    <div>
      <PageHeader eyebrow="Responses" title="Responses" description="Receiving a warning is not the same as understanding it. See who was reached, who is safe and who needs help." />
      <RouteTabs base="/responses" tabs={TABS} active={tab} />
      <EmbeddedContext.Provider value>
        {tab === 'residents' && <ResidentResponses />}
        {tab === 'tracked' && <Receipts />}
        {tab === 'analytics' && (
          <Suspense fallback={<div className="skeleton h-72" aria-busy="true" />}>
            <Analytics />
          </Suspense>
        )}
      </EmbeddedContext.Provider>
    </div>
  );
}
