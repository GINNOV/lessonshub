const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const DEFAULT_SCHEDULING_TIME_ZONE = "America/Chicago";

const FALLBACK_TIME_ZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Rome",
  "UTC",
] as const;

const FRIENDLY_TIME_ZONE_LABELS: Record<string, string> = {
  "America/Chicago": "Central Time (CST/CDT) - America/Chicago",
  "America/New_York": "Eastern Time (EST/EDT) - America/New_York",
  "America/Denver": "Mountain Time (MST/MDT) - America/Denver",
  "America/Los_Angeles": "Pacific Time (PST/PDT) - America/Los_Angeles",
  "America/Phoenix": "Arizona Time (MST) - America/Phoenix",
  "Europe/London": "United Kingdom - Europe/London",
  "Europe/Rome": "Italy - Europe/Rome",
  UTC: "UTC",
};

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
};

const getDateTimeParts = (date: Date, timeZone: string): DateTimeParts => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
  };
};

const toUtcMinuteStamp = (parts: DateTimeParts) =>
  Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) /
  60000;

const parseInputParts = (value: string): DateTimeParts | null => {
  const match = value.match(DATE_TIME_INPUT_PATTERN);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
};

export const getDateKeyInTimeZone = (date: Date | string, timeZone: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = getDateTimeParts(parsed, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
};

export const getDayOfMonthInTimeZone = (
  date: Date | string,
  timeZone: string,
) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return getDateTimeParts(parsed, timeZone).day;
};

export const shiftDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

export const formatDateTimeForInput = (
  date: Date | string | null | undefined,
  timeZone: string,
): string => {
  if (!date) return "";

  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    const parts = getDateTimeParts(parsed, timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day,
    ).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(
      parts.minute,
    ).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

export const parseDateTimeInputInTimeZone = (
  value: string | undefined,
  timeZone: string,
) => {
  if (!value) return null;

  const target = parseInputParts(value);
  if (!target) return null;

  let utcMillis = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  );

  for (let i = 0; i < 4; i += 1) {
    const actual = getDateTimeParts(new Date(utcMillis), timeZone);
    const diffMinutes = toUtcMinuteStamp(target) - toUtcMinuteStamp(actual);
    if (diffMinutes === 0) break;
    utcMillis += diffMinutes * 60_000;
  }

  const result = new Date(utcMillis);
  return formatDateTimeForInput(result, timeZone) === value ? result : null;
};

export const convertDateTimeInputBetweenTimeZones = (
  value: string,
  fromTimeZone: string,
  toTimeZone: string,
) => {
  const parsed = parseDateTimeInputInTimeZone(value, fromTimeZone);
  if (!parsed) return value;
  return formatDateTimeForInput(parsed, toTimeZone);
};

export const formatDateTimeForScheduleDisplay = (
  date: Date | string,
  timeZone: string,
) => {
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(parsed);
  } catch {
    return new Date(date).toLocaleString();
  }
};

export const getSchedulingTimeZoneOptions = () => {
  const supported =
    typeof Intl !== "undefined" &&
    "supportedValuesOf" in Intl &&
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [...FALLBACK_TIME_ZONES];

  const values = Array.from(
    new Set([DEFAULT_SCHEDULING_TIME_ZONE, ...supported]),
  );

  return values.map((value) => ({
    value,
    label:
      FRIENDLY_TIME_ZONE_LABELS[value] ?? value.replaceAll("_", " "),
  }));
};
