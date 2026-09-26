import { CircleCheck, Download, Filter, HandHelping, Hourglass, Inbox, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS } from '../components/badges';
import { DeliveryTimeline, MetricCard, ReceiptTable } from '../components/tracking';
import { RecipientPhonePreview } from '../components/visual';
import { Button, EmptyState, PageHeader, Panel, SectionTitle } from '../components/ui';
import { languageInfo, LANGUAGES } from '../data/languages';
import { CHANNEL_LABEL, PERSONAS } from '../data/network';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { AlertFormat, Channel, DeliveryStatus, LanguageCode, PersonaId } from '../types';
import { downloadDeliveryCsv } from '../utils/export';
import { pct } from '../utils/time';

type Filters = { status: DeliveryStatus | ''; language: LanguageCode | ''; format: AlertFormat | ''; channel: Channel | ''; group: PersonaId | '' };
const FORMATS: AlertFormat[] = ['Standard', 'Large Text', 'Visual', 'Icon', 'Voice + Text', 'Relay Package', 'SMS'];

export default function Receipts() {
  const alert = useSelectedAlert();
  const deliveries = useStore((s) => s.deliveries);
  const acknowledge = useStore((s) => s.acknowledge);
  const startDelivery = useStore((s) => s.startDelivery);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({ status: '', language: '', format: '', channel: '', group: '' });
  const [selectedId, setSelectedId] = useState<string>();

  const records = useMemo(() => deliveries.filter((d) => d.alertId === alert.id), [deliveries, alert.id]);
  const filtered = records.filter(
    (r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.language || r.language === filters.language) &&
      (!filters.format || r.format === filters.format) &&
      (!filters.channel || r.channel === filters.channel) &&
      (!filters.group || r.recipient.persona === filters.group),
  );
  const selected = records.find((r) => r.id === selectedId) ?? records.find((r) => r.status === 'DELIVERED') ?? records[0];

  const total = records.length;
  const delivered = records.filter((r) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(r.status)).length;
  const acked = records.filter((r) => r.status === 'ACKNOWLEDGED').length;
  const help = records.filter((r) => r.status === 'NEEDS_HELP').length;
  const pending = total - delivered;

  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const select = 'min-h-11 w-full rounded-lg border border-line bg-panel-2 px-2 text-sm';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 7 · Receipt Tracker"
        title="Receipt Tracker & Acknowledgements"
        description="Receiving a warning and understanding it are not the same. Track delivery, understanding and requests for help per synthetic recipient."
        actions={
          <Button icon={Download} disabled={!total} onClick={() => { downloadDeliveryCsv(alert, records); toast('Delivery report CSV downloaded (simulated data).', 'success'); }}>
            Download CSV report
          </Button>
        }
      />

      {!total ? (
        <EmptyState
          icon={Inbox}
          title="No delivery records for this alert yet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={Send} onClick={() => { startDelivery(alert.id); navigate('/delivery'); }}>
                Start simulated delivery
              </Button>
            </div>
          }
        >
          Start a simulated delivery run in the Delivery Simulator — statuses will update here live.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Acknowledgement statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Delivered" value={pct(delivered, total)} suffix="%" icon={CircleCheck} tone="ok" hint={`${delivered} of ${total}`} />
            <MetricCard label="Acknowledged" value={pct(acked, total)} suffix="%" icon={CircleCheck} tone="info" hint={`${acked} understood / received`} />
            <MetricCard label="Needs Help" value={pct(help, total)} suffix="%" icon={HandHelping} tone="crit" hint={`${help} flagged for responders`} />
            <MetricCard label="Pending" value={pct(pending, total)} suffix="%" icon={Hourglass} tone="warn" hint={`${pending} not yet delivered`} />
          </section>

          <div className="grid gap-4 2xl:grid-cols-[1fr_22rem]">
            <Panel>
              <SectionTitle icon={Filter} right={<span className="text-xs text-ink-3">{filtered.length} of {total} shown</span>}>
                Delivery status
              </SectionTitle>
              <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                <label className="text-xs font-semibold text-ink-3">
                  Status
                  <select className={select} value={filters.status} onChange={(e) => setF('status', e.target.value as DeliveryStatus)}>
                    <option value="">All</option>
                    {(Object.keys(STATUS) as DeliveryStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-3">
                  Language
                  <select className={select} value={filters.language} onChange={(e) => setF('language', e.target.value as LanguageCode)}>
                    <option value="">All</option>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-3">
                  Format
                  <select className={select} value={filters.format} onChange={(e) => setF('format', e.target.value as AlertFormat)}>
                    <option value="">All</option>
                    {FORMATS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-3">
                  Delivery mode
                  <select className={select} value={filters.channel} onChange={(e) => setF('channel', e.target.value as Channel)}>
                    <option value="">All</option>
                    {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
                      <option key={c} value={c}>
                        {CHANNEL_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 text-xs font-semibold text-ink-3 md:col-span-1">
                  Recipient group
                  <select className={select} value={filters.group} onChange={(e) => setF('group', e.target.value as PersonaId)}>
                    <option value="">All</option>
                    {PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filtered.length ? (
                <ReceiptTable records={filtered} onSelect={(r) => setSelectedId(r.id)} selectedId={selected?.id} />
              ) : (
                <EmptyState icon={Filter} title="No records match these filters" action={<Button size="sm" onClick={() => setFilters({ status: '', language: '', format: '', channel: '', group: '' })}>Clear filters</Button>} />
              )}
            </Panel>

            {selected && (
              <Panel>
                <h2 className="font-bold">Recipient preview — {selected.recipient.name}</h2>
                <p className="mb-3 text-xs text-ink-3">
                  {languageInfo(selected.language).name} · {selected.format} · {CHANNEL_LABEL[selected.channel]}
                </p>
                <RecipientPhonePreview
                  alert={alert}
                  record={selected}
                  lang={selected.language}
                  onAck={(a) => {
                    acknowledge(selected.id, a);
                    toast(a === 'needHelp' ? `${selected.recipient.name} flagged: needs help.` : `${selected.recipient.name} acknowledged.`, a === 'needHelp' ? 'warning' : 'success');
                  }}
                />
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold">Delivery timeline</h3>
                  <DeliveryTimeline record={selected} />
                </div>
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}
