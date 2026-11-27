// Approved lesson type display labels for cards and badges.
// Add an entry here for each new lesson type, so cards and badges show the same label.
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
