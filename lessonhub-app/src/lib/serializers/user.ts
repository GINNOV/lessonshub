import { decimalToNullableNumber } from './decimal'

type UserDecimalFields = {
  defaultLessonPrice?: unknown
  referralRewardPercent?: unknown
  referralRewardMonthlyAmount?: unknown
}

type ReplacedUserDecimalFields<T extends UserDecimalFields> = Omit<
  T,
  'defaultLessonPrice' | 'referralRewardPercent' | 'referralRewardMonthlyAmount'
> & {
  defaultLessonPrice: number | null
  referralRewardPercent: number | null
  referralRewardMonthlyAmount: number | null
}

export type SerializedUserDecimalFields<T extends Record<string, unknown> = Record<string, unknown>> =
  ReplacedUserDecimalFields<T & UserDecimalFields>

export function serializeUserDecimalFields<T extends Record<string, unknown> & UserDecimalFields>(
  user: T | null | undefined
): SerializedUserDecimalFields<T> | null {
  if (!user) return user ?? null

  return {
    ...user,
    defaultLessonPrice: decimalToNullableNumber(user.defaultLessonPrice),
    referralRewardPercent: decimalToNullableNumber(user.referralRewardPercent),
    referralRewardMonthlyAmount: decimalToNullableNumber(user.referralRewardMonthlyAmount),
  } as SerializedUserDecimalFields<T>
}
