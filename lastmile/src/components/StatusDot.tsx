import { STATUS_COLOR } from './DisasterMap';

export function StatusDot({ status }: { status: number }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />;
}
