export const GOLD_STAR_POINTS = 11;
export const GOLD_STAR_VALUE_EURO = 200;
export const POINT_TO_EURO_RATE = GOLD_STAR_VALUE_EURO / GOLD_STAR_POINTS;
export const EXTRA_POINT_TO_EURO_RATE = 0.4;

export function convertPointsToEuro(points: number) {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round(points * POINT_TO_EURO_RATE * 100) / 100;
}

export function convertExtraPointsToEuro(points: number) {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round(points * EXTRA_POINT_TO_EURO_RATE * 100) / 100;
}

export function convertEuroToPoints(amountEuro: number) {
  if (!Number.isFinite(amountEuro) || amountEuro <= 0) return 0;
  return Math.round(amountEuro / POINT_TO_EURO_RATE);
}
