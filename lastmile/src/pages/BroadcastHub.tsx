import { Network, Users } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { EmbeddedContext, PageHeader, RouteTabs, type TabDef } from '../components/ui';
import Broadcast from './Broadcast';
import Delivery from './Delivery';

const TABS: TabDef[] = [
  { id: 'all', label: 'Broadcast to everyone', icon: Users, hint: '1,000+' },
  { id: 'network', label: 'Relay network (12 tracked)', icon: Network },
];

export default function BroadcastHub() {
  const { tab = 'all' } = useParams();
  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/broadcast/all" replace />;
  return (
    <div>
      <PageHeader eyebrow="Broadcast & SOS" title="Broadcast & SOS" description="Send the alert or an SOS to every resident — simulated over internet, SMS and community relay, including low-bandwidth and offline conditions." />
      <RouteTabs base="/broadcast" tabs={TABS} active={tab} />
      <EmbeddedContext.Provider value>{tab === 'all' ? <Broadcast /> : <Delivery />}</EmbeddedContext.Provider>
    </div>
  );
}
