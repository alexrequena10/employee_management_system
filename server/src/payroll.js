export const DEFAULT_WORKER_RATE_PER_SQFT = 1.8;

export function workerPayCentsFromSqft(sqft, rate = DEFAULT_WORKER_RATE_PER_SQFT) {
  const sq = Number(sqft) || 0;
  const r = Number(rate) || DEFAULT_WORKER_RATE_PER_SQFT;
  return Math.round(sq * r * 100);
}

export function workerPayFromSqft(sqft, rate = DEFAULT_WORKER_RATE_PER_SQFT) {
  return (Number(sqft) || 0) * (Number(rate) || DEFAULT_WORKER_RATE_PER_SQFT);
}
