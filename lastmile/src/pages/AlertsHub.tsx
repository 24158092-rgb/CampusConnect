import { BookOpen, FileCheck2, Image, Languages, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { ActiveAlertBar } from '../components/ActiveAlertBar';
import { PrecautionsCard } from '../components/Precautions';
import { EmbeddedContext, PageHeader, RouteTabs, type TabDef } from '../components/ui';
import { useSelectedAlert } from '../store/useStore';
import Alerts from './Alerts';
import Clarity from './Clarity';
import Language from './Language';
import Official from './Official';
import Pipeline from './Pipeline';
import Visual from './Visual';

const TABS: TabDef[] = [
  { id: 'official', label: 'Official alert', icon: FileCheck2, hint: 'source' },
  { id: 'simplified', label: 'Simplified', icon: Sparkles },
  { id: 'translations', label: 'Translations', icon: Languages },
  { id: 'visual', label: 'Visual & voice', icon: Image },
  { id: 'integrity', label: 'Integrity check', icon: ShieldCheck },
  { id: 'library', label: 'Alert library', icon: BookOpen },
];

export default function AlertsHub() {
  const { tab = 'official' } = useParams();
  const alert = useSelectedAlert();
  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/alerts/official" replace />;
  return (
    <div>
      <PageHeader
        eyebrow="Alerts"
        title="Alerts"
        description="The official alert is kept on its own tab, unchanged. Simplified, translated and visual versions are derived from it and clearly labelled."
      />
      <ActiveAlertBar />
      <RouteTabs base="/alerts" tabs={TABS} active={tab} />
      <EmbeddedContext.Provider value>
        {tab === 'official' && (
          <div className="space-y-5">
            <Official />
            <PrecautionsCard hazard={alert.type} />
          </div>
        )}
        {tab === 'simplified' && <Clarity />}
        {tab === 'translations' && <Language />}
        {tab === 'visual' && <Visual />}
        {tab === 'integrity' && <Pipeline />}
        {tab === 'library' && <Alerts />}
      </EmbeddedContext.Provider>
    </div>
  );
}
