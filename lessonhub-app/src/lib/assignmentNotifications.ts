export interface AssignmentScheduleEntry {
  studentId: string;
  startDate: Date;
}

export function getImmediateStartStudentIds(
  entries: AssignmentScheduleEntry[],
  now: Date = new Date()
): string[] {
  return entries
    .filter((entry) => entry.startDate <= now)
    .map((entry) => entry.studentId);
}
