# Points and Savings Calculation

This document describes how points, euros (savings), and awards are computed today.

## Core Points

- **Assignment grading points** are computed when a teacher grades an assignment using
  `calculateAssignmentPoints` in `src/lib/gamification.ts`. The result is stored on
  `Assignment.pointsAwarded` and applied to `User.totalPoints`.
- **Extra points** (bonus points) can be added by the teacher at grading time. They are
  included in `pointsAwarded` and applied to `totalPoints`.
- **Points ledger**: `pointTransaction` rows are created for grading adjustments,
  extensions, gold stars, and composer penalties. (Note: the ledger can be cleared for
  reset events.)

## Composer Lesson Penalties

- Composer lessons track per-question tries.
- **Extra tries** above the per-question max cost **50 points per extra try**.
- The penalty is applied immediately when the student submits the composer assignment
  (see `submitComposerAssignment` in `src/actions/lessonActions.tsx`).

## Extensions

- A deadline extension costs **200 points** (`EXTENSION_POINT_COST` in
  `src/lib/lessonExtensions.ts`).
- Only one extension per assignment is allowed.

## Gold Star Award

- A gold star grants:
  - **Euro value**: `amountEuro` (rounded to a whole euro, minimum 0).
  - **Points**: scaled from the euro amount via the current points/euro rate.
- The points/euro conversion rate is derived from `GOLD_STAR_VALUE_EURO /
  GOLD_STAR_POINTS` in `src/lib/points.ts`.
- Gold stars update both `User.totalPoints` and the `goldStar` table, and create a
  `pointTransaction` entry.

## Savings (Euros)

Historically, savings were calculated from assignment outcomes:

- **GRADED**: +lesson price
- **FAILED**: -lesson price
- **Extra points**: +`convertExtraPointsToEuro(extraPoints)`
- **Composer extra tries**: -50 euros per extra try
- **Extension**: -200 euros (per extension)
- **Gold stars**: +gold star `amountEuro`

### Reset Event Notes

The new-year reset used one-off data adjustments (points and savings) to stabilize the
leaderboard. The leaderboard now runs on live calculations again.

## Related Files

- `src/lib/points.ts` (points/euro rates and converters)
- `src/lib/gamification.ts` (grading points logic)
- `src/lib/lessonExtensions.ts` (extension cost)
- `src/actions/lessonActions.tsx` (submission/penalties, stats)
- `src/actions/studentActions.ts` (student leaderboard/profile)
- `src/actions/teacherActions.ts` (teacher leaderboard)
