// Approved lesson type display labels for cards and badges.
// Keep this map in sync when adding new lesson types to ensure consistent UI copy.
import { LessonType } from "@prisma/client";

export const LESSON_TYPE_SHORT_LABELS: Record<LessonType, string> = {
  [LessonType.STANDARD]: "TOPIC",
  [LessonType.FLASHCARD]: "FLASH",
  [LessonType.MULTI_CHOICE]: "MULTI",
  [LessonType.LEARNING_SESSION]: "SESSION",
  [LessonType.NEWS_ARTICLE]: "NEWS",
  [LessonType.LYRIC]: "LYRIC",
  [LessonType.COMPOSER]: "COMP",
  [LessonType.ARKANING]: "GAME",
  [LessonType.FLIPPER]: "FLIP",
};
