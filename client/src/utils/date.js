export function formatJobDate(value) {
  if (!value) return '—';
  const normalized = String(value).includes('T')
    ? value
    : String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
