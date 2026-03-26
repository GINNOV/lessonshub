import { revalidatePath, revalidateTag } from 'next/cache'

export const cacheTags = {
  assignment: (assignmentId: string) => `assignment:${assignmentId}`,
  assignmentPage: (assignmentId: string) => `assignment-page:${assignmentId}`,
  studentLessons: (studentId: string) => `student-lessons:${studentId}`,
  freeLessons: (studentId: string) => `free-lessons:${studentId}`,
  hubGuides: 'hub-guides',
  lessonSubmissions: (lessonId: string) => `lesson-submissions:${lessonId}`,
  teacherDashboard: (teacherId: string) => `teacher-dashboard:${teacherId}`,
  teacherDirectory: 'teacher-directory',
  adminUsers: 'admin-users',
  adminLessons: 'admin-lessons',
  adminTeachers: 'admin-teachers',
} as const

type StudentAssignmentRevalidationInput = {
  assignmentId?: string
  studentId: string
  lessonId?: string | null
  teacherId?: string | null
}

export function revalidateStudentAssignmentViews({
  assignmentId,
  studentId,
  lessonId,
  teacherId,
}: StudentAssignmentRevalidationInput) {
  revalidateTag(cacheTags.studentLessons(studentId))
  revalidateTag(cacheTags.freeLessons(studentId))
  revalidatePath('/my-lessons')

  if (assignmentId) {
    revalidateTag(cacheTags.assignment(assignmentId))
    revalidateTag(cacheTags.assignmentPage(assignmentId))
    revalidatePath(`/assignments/${assignmentId}`)
  }

  if (lessonId) {
    revalidateTag(cacheTags.lessonSubmissions(lessonId))
    revalidatePath(`/dashboard/submissions/${lessonId}`)
  }

  if (teacherId) {
    revalidateTag(cacheTags.teacherDashboard(teacherId))
    revalidatePath('/dashboard')
  }
}

export function revalidateAdminUserViews(userId?: string) {
  revalidateTag(cacheTags.adminUsers)
  revalidatePath('/admin/users')

  if (userId) {
    revalidatePath(`/admin/users/${userId}`)
    revalidatePath(`/admin/users/edit/${userId}`)
  }
}

export function revalidateAdminLessonViews() {
  revalidateTag(cacheTags.adminLessons)
  revalidateTag(cacheTags.adminTeachers)
  revalidatePath('/admin/lessons')
}
