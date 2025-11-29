export const EXTENSION_POINT_COST = 200;

export function isExtendedDeadline(
  deadline: Date | null | undefined,
  originalDeadline: Date | null | undefined
) {
  if (!deadline || !originalDeadline) return false;
  return originalDeadline.getTime() !== deadline.getTime();
}
