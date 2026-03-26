type DecimalLike = {
  toNumber: () => number
}

function isDecimalLike(value: unknown): value is DecimalLike {
  return Boolean(value) && typeof value === 'object' && typeof (value as DecimalLike).toNumber === 'function'
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (isDecimalLike(value)) {
    const parsed = value.toNumber()
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function decimalToNumber(value: unknown, fallback = 0) {
  return toFiniteNumber(value) ?? fallback
}

export function decimalToNullableNumber(value: unknown) {
  return toFiniteNumber(value)
}

export function dateToIsoOrNull(value: unknown) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
