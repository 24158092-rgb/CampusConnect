export const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));
