export const DEFAULT_WORKER_RATE_PER_SQFT = 1.8;

export const JOB_TITLES = ['Frame labor', 'Siding', 'Cornice', 'Decking'];

export const CLIENT_NAMES = ['Lennar', 'D.R. Horton'];

export function workerPayFromSqft(sqft, rate = DEFAULT_WORKER_RATE_PER_SQFT) {
  const n = Number(sqft) || 0;
  const r = Number(rate) || DEFAULT_WORKER_RATE_PER_SQFT;
  return n * r;
}

export function formatWorkerPay(sqft, rate = DEFAULT_WORKER_RATE_PER_SQFT) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(workerPayFromSqft(sqft, rate));
}
