//
//  Assignment.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

struct Assignment: Codable, Identifiable {
    let id: String
    let studentId: String
    let lessonId: String
    let deadline: String
    let status: String
    let pointsAwarded: Int
    let teacherAnswerComments: String?
    let lesson: Lesson
}

struct Lesson: Codable, Identifiable {
    let id: String
    let title: String
    let assignment_text: String
    let lesson_preview: String?
    let assignment_image_url: String?
    let price: Double
    let completionCount: Int
    let submittedCount: Int
    let teacher: Teacher?
}

struct Teacher: Codable, Identifiable {
    let id: String
    let name: String?
    let email: String?
    let image: String?
    let defaultLessonPrice: Double?
}
