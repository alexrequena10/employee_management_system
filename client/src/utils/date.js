// Date-only values ("2026-10-15") are calendar dates; SQLite datetime('now') values are UTC without a zone suffix.
function parseDate(value) {
  const str = String(value);
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const iso = str.includes('T') ? str : str.replace(' ', 'T');
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

export function formatJobDate(value) {
  if (!value) return '—';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
