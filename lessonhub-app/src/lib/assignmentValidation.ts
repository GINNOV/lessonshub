// file: src/lib/assignmentValidation.ts
import { AssignmentStatus } from "@prisma/client";

type SubmissionValidationResult =
  | { ok: true }
  | { ok: false; error: string; reason: "status" | "deadline" };

export function validateAssignmentForSubmission(assignment: {
  status: AssignmentStatus;
  deadline: Date;
}): SubmissionValidationResult {
  if (assignment.status !== AssignmentStatus.PENDING) {
    return {
      ok: false,
      error: "Assignment has already been submitted.",
      reason: "status",
    };
  }
  if (new Date() > new Date(assignment.deadline)) {
    return {
      ok: false,
      error: "The deadline for this assignment has passed.",
      reason: "deadline",
    };
  }
  return { ok: true };
}
