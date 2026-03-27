import { describe, expect, it } from "vitest";

import {
  convertDateTimeInputBetweenTimeZones,
  formatDateTimeForInput,
  parseDateTimeInputInTimeZone,
} from "./schedulingTimeZone";

describe("schedulingTimeZone", () => {
  it("formats dates for a specific time zone input", () => {
    expect(
      formatDateTimeForInput("2026-03-26T15:30:00.000Z", "America/Chicago"),
    ).toBe("2026-03-26T10:30");
  });

  it("parses schedule input in America/Chicago back to UTC", () => {
    expect(
      parseDateTimeInputInTimeZone(
        "2026-03-26T10:30",
        "America/Chicago",
      )?.toISOString(),
    ).toBe("2026-03-26T15:30:00.000Z");
  });

  it("converts between scheduling time zones while preserving the same instant", () => {
    expect(
      convertDateTimeInputBetweenTimeZones(
        "2026-03-26T10:30",
        "America/Chicago",
        "America/New_York",
      ),
    ).toBe("2026-03-26T11:30");
  });

  it("rejects local times skipped by DST", () => {
    expect(
      parseDateTimeInputInTimeZone(
        "2026-03-08T02:30",
        "America/Chicago",
      ),
    ).toBeNull();
  });
});
