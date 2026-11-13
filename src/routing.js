/**
 * routing.js — risk scoring utilities for safe-route suggestions.
 *
 * riskMap(reports) → Map<reportId, { score, ageDays }>
 *
 * createdAt may arrive as:
 *   - a Firestore Timestamp object  (has .toMillis())
 *   - a plain number                (ms since epoch)
 *   - a Date object
 *   - an ISO string
 * All are normalised to ms-since-epoch before scoring.
 */

/** Normalise any createdAt value to milliseconds since epoch. */
function toMs(createdAt) {
  if (!createdAt) return Date.now();
  // Firestore Timestamp
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  // number (already ms)
  if (typeof createdAt === 'number') return createdAt;
  // Date object or ISO string
  return new Date(createdAt).getTime();
}

const MS_PER_DAY = 86_400_000;

/**
 * Returns a Map from report id → { score: number, ageDays: number }.
 * score is in [0, 1]: 1 = very recent confirmed report, 0 = resolved or old.
 *
 * @param {Array} reports  — array of report objects from api.listReports()
 * @returns {Map<string, { score: number, ageDays: number }>}
 */
export function riskMap(reports) {
  const now = Date.now();
  const result = new Map();

  for (const r of reports) {
    const ageDays = (now - toMs(r.createdAt)) / MS_PER_DAY;

    if (r.status === 'resolved') {
      result.set(r.id, { score: 0, ageDays });
      continue;
    }

    // Recency decay: half-life of 7 days
    const recency = Math.exp((-ageDays * Math.LN2) / 7);

    // Confirmation boost: each confirmation (up to OK) adds weight
    const confirmations = r.confirmations?.length ?? 0;
    const confirmBoost  = Math.min(confirmations / 3, 1) * 0.4;

    const score = Math.min(recency * (0.6 + confirmBoost), 1);
    result.set(r.id, { score, ageDays });
  }

  return result;
}
