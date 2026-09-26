import { ArrowRight, ScanSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EntityLegend, OriginalAlertPanel, ValidationChecklist } from '../components/alert';
import { CommunityNotes, CoreFacts } from '../components/lineage';
import { Button, PageHeader, Panel, SectionTitle } from '../components/ui';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import { validateOfficial } from '../utils/validation';

export default function Official() {
  const alert = useSelectedAlert();
  const validatedAt = useStore((s) => s.validatedAt[alert.id]);
  const validate = useStore((s) => s.validateOfficialAlert);
  const navigate = useNavigate();
  const result = validateOfficial(alert);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 2 · Official Alert"
        title="Official Alert — exactly as received"
        description="The source of truth. LASTMILE never edits this text; every other version is derived from it and checked against it."
        actions={
          <>
            <Button
              icon={ScanSearch}
              onClick={() => {
                const ok = validate(alert.id);
                toast(ok ? 'Official alert validated: all structured fields found in the message.' : 'Validated with warnings — see the checklist.', ok ? 'success' : 'warning');
              }}
            >
              {validatedAt ? 'Re-validate' : 'Validate official alert'}
            </Button>
            <Button variant="primary" icon={ArrowRight} onClick={() => navigate('/clarity')}>
              Run Clarity Processor
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <OriginalAlertPanel alert={alert} />
          <EntityLegend />
          <CoreFacts alert={alert} />
        </div>
        <div className="space-y-4">
          <Panel>
            <SectionTitle icon={ScanSearch}>Structured extraction check</SectionTitle>
            {validatedAt ? (
              <ValidationChecklist result={result} title="Source message vs structured fields" compact />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-ink-3">Not validated yet. Validation extracts hazard, severity, area, start/end time and action, and confirms they appear in the message.</p>
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            )}
          </Panel>
          <CommunityNotes alert={alert} />
        </div>
      </div>
    </div>
  );
}
